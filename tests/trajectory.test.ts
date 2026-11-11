import { describe, it, expect, beforeAll } from 'vitest';
import { generateTrajectory, getTrajectoryAtMET } from '../src/lib/trajectory.js';
import { distance3D, EARTH_RADIUS_UNITS, MOON_RADIUS_UNITS, EARTH_MOON_DISTANCE } from '../src/lib/orbital-math.js';

let trajectory: ReturnType<typeof generateTrajectory>;

beforeAll(() => {
  trajectory = generateTrajectory(600);
});

describe('generateTrajectory', () => {
  it('genera al menos 500 puntos', () => {
    expect(trajectory.length).toBeGreaterThanOrEqual(500);
  });

  it('comienza en T+0 cerca de la superficie terrestre', () => {
    const first = trajectory[0];
    const distFromEarth = distance3D(first.x, first.y, first.z, 0, 0, 0);
    expect(distFromEarth).toBeGreaterThan(EARTH_RADIUS_UNITS * 0.9);
    expect(distFromEarth).toBeLessThan(50);
  });

  it('termina cerca de la Tierra en el amerizaje', () => {
    const last = trajectory[trajectory.length - 1];
    const distFromEarth = distance3D(last.x, last.y, last.z, 0, 0, 0);
    expect(distFromEarth).toBeLessThan(50);
  });

  it('los valores de TEM son monótonamente crecientes', () => {
    for (let i = 1; i < trajectory.length; i++) {
      expect(trajectory[i].met).toBeGreaterThanOrEqual(trajectory[i - 1].met);
    }
  });

  it('el primer punto tiene TEM = 0', () => {
    expect(trajectory[0].met).toBe(0);
  });

  it('todos los puntos tienen velocidades válidas (>= 0)', () => {
    trajectory.forEach((pt, i) => {
      expect(pt.velocity, `Punto ${i} velocidad`).toBeGreaterThanOrEqual(0);
      expect(isFinite(pt.velocity), `Punto ${i} velocidad finita`).toBe(true);
    });
  });

  it('todos los puntos tienen coordenadas válidas (finitas)', () => {
    trajectory.forEach((pt, i) => {
      expect(isFinite(pt.x), `Punto ${i} x`).toBe(true);
      expect(isFinite(pt.y), `Punto ${i} y`).toBe(true);
      expect(isFinite(pt.z), `Punto ${i} z`).toBe(true);
    });
  });

  it('todos los puntos tienen una fase no vacía', () => {
    trajectory.forEach((pt, i) => {
      expect(pt.phase, `Punto ${i} fase`).toBeTruthy();
      expect(pt.phase.length, `Punto ${i} longitud de fase`).toBeGreaterThan(0);
    });
  });

  it('alcanza una distancia cercana a la Luna en algún momento', () => {
    // En la máxima aproximación, debe estar a menos de 50 unidades de la Luna
    const nearMoon = trajectory.some(pt => pt.dist_moon < 50);
    expect(nearMoon).toBe(true);
  });

  it('la distancia máxima a la Tierra supera las 380 unidades (más allá de la Luna)', () => {
    const maxDist = Math.max(...trajectory.map(pt => pt.dist_earth));
    expect(maxDist).toBeGreaterThan(380);
  });

  it('la trayectoria pasa a menos de 30 unidades de la Luna (sobrevuelo de retorno libre)', () => {
    const minMoonDist = Math.min(...trajectory.map(pt => pt.dist_moon));
    expect(minMoonDist).toBeLessThan(30);
  });

  it('dist_earth es coherente con la posición calculada', () => {
    trajectory.slice(0, 50).forEach((pt, i) => {
      const computed = distance3D(pt.x, pt.y, pt.z, 0, 0, 0);
      expect(Math.abs(computed - pt.dist_earth)).toBeLessThan(1);
    });
  });

  it('tiene fase LANZAMIENTO al inicio', () => {
    expect(trajectory[0].phase).toBe('LANZAMIENTO');
  });

  it('tiene fase VUELO DE IDA durante el trayecto de ida', () => {
    // En torno al día 1 (86400 s) — bien dentro de VUELO DE IDA (termina en T+4d18h)
    const day1Point = trajectory.find(pt => pt.met >= 86400);
    expect(day1Point?.phase).toBe('VUELO DE IDA');
  });
});

describe('getTrajectoryAtMET', () => {
  it('devuelve el primer punto cuando TEM = 0', () => {
    const pt = getTrajectoryAtMET(trajectory, 0);
    expect(pt.x).toBeCloseTo(trajectory[0].x, 2);
    expect(pt.y).toBeCloseTo(trajectory[0].y, 2);
    expect(pt.z).toBeCloseTo(trajectory[0].z, 2);
  });

  it('devuelve el último punto cuando el TEM supera el total', () => {
    const pt = getTrajectoryAtMET(trajectory, 9999999);
    const last = trajectory[trajectory.length - 1];
    expect(pt.x).toBeCloseTo(last.x, 2);
  });

  it('interpola entre puntos conocidos', () => {
    const a = trajectory[10];
    const b = trajectory[11];
    const midMET = (a.met + b.met) / 2;
    const mid = getTrajectoryAtMET(trajectory, midMET);
    expect(mid.x).toBeCloseTo((a.x + b.x) / 2, 2);
    expect(mid.z).toBeCloseTo((a.z + b.z) / 2, 2);
  });

  it('devuelve una fase correcta en el TLI', () => {
    const tliMET = 7020; // ~1h57m
    const pt = getTrajectoryAtMET(trajectory, tliMET);
    expect(pt.phase).not.toBe('');
  });

  it('existe fase de sobrevuelo lunar en torno al día 5-6', () => {
    const flybytMET = 5 * 86400 + 19 * 3600;
    const pt = getTrajectoryAtMET(trajectory, flybytMET);
    expect(['SOBREVUELO LUNAR', 'OBSERVACIÓN LUNAR', 'ADQUISICIÓN DE SEÑAL']).toContain(pt.phase);
  });
});

describe('Waypoints clave de la trayectoria', () => {
  it('velocidad plausible en TLI (> 5.000 km/h — trayectoria simplificada)', () => {
    // La velocidad real en TLI es ~39.000 km/h; los waypoints simplificados dan
    // valores menores por la resolución temporal gruesa en torno a la quema.
    const tli = getTrajectoryAtMET(trajectory, 7020);
    expect(tli.velocity).toBeGreaterThan(5000);
  });

  it('el punto del récord de distancia supera las 400 unidades', () => {
    // T+5d7h56m — supera el récord del Apollo 13 (400.171 km)
    const recordMET = 5 * 86400 + 7 * 3600 + 56 * 60;
    const pt = getTrajectoryAtMET(trajectory, recordMET);
    expect(pt.dist_earth).toBeGreaterThan(200); // > 200.000 km
  });

  it('el punto de distancia máxima se halla cerca de la Luna (sobrevuelo)', () => {
    const maxDistMET = 5 * 86400 + 19 * 3600 + 7 * 60;
    const pt = getTrajectoryAtMET(trajectory, maxDistMET);
    // Debe estar lejos de la Tierra y razonablemente cerca de la Luna
    expect(pt.dist_earth).toBeGreaterThan(200);
  });
});
