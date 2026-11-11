import { describe, it, expect } from 'vitest';
import {
  formatMET,
  parseMET,
  distance3D,
  lerp,
  findClosestIndex,
  interpolateAtMET,
  moonPositionAtMET,
  getMissionPhase,
  EARTH_RADIUS_UNITS,
  MOON_RADIUS_UNITS,
  EARTH_MOON_DISTANCE,
} from '../src/lib/orbital-math.js';

describe('formatMET', () => {
  it('formatea cero correctamente', () => {
    expect(formatMET(0)).toBe('000:00:00:00');
  });

  it('formatea 1 hora correctamente', () => {
    expect(formatMET(3600)).toBe('000:01:00:00');
  });

  it('formatea TEM de varios días', () => {
    expect(formatMET(5 * 86400 + 19 * 3600 + 2 * 60)).toBe('005:19:02:00');
  });

  it('formatea el TEM del amerizaje', () => {
    // T+9d 7h 10m
    const met = 9 * 86400 + 7 * 3600 + 10 * 60;
    expect(formatMET(met)).toBe('009:07:10:00');
  });
});

describe('parseMET', () => {
  it('analiza TEM cero', () => {
    expect(parseMET('000:00:00:00')).toBe(0);
  });

  it('analiza TEM de la TLI (1h 57m)', () => {
    expect(parseMET('000:01:57:00')).toBe(7020);
  });

  it('analiza el TEM de la máxima aproximación', () => {
    const seconds = 5 * 86400 + 19 * 3600 + 2 * 60;
    expect(parseMET('005:19:02:00')).toBe(seconds);
  });

  it('realiza una conversión de ida y vuelta correctamente', () => {
    const original = 5 * 86400 + 19 * 3600 + 25 * 60 + 33;
    expect(parseMET(formatMET(original))).toBe(original);
  });
});

describe('distance3D', () => {
  it('devuelve 0 para el mismo punto', () => {
    expect(distance3D(1, 2, 3, 1, 2, 3)).toBe(0);
  });

  it('devuelve la distancia correcta para vectores unitarios', () => {
    expect(distance3D(0, 0, 0, 1, 0, 0)).toBe(1);
    expect(distance3D(0, 0, 0, 0, 1, 0)).toBe(1);
    expect(distance3D(0, 0, 0, 0, 0, 1)).toBe(1);
  });

  it('devuelve la distancia 3D correcta', () => {
    // triángulo 3-4-5 en 3D
    expect(distance3D(0, 0, 0, 3, 4, 0)).toBeCloseTo(5, 5);
  });

  it('la distancia Tierra-Luna es ~384 unidades', () => {
    const dist = distance3D(0, 0, 0, EARTH_MOON_DISTANCE, 0, 0);
    expect(dist).toBeCloseTo(EARTH_MOON_DISTANCE, 1);
  });
});

describe('lerp', () => {
  it('devuelve el inicio en t=0', () => {
    expect(lerp(10, 20, 0)).toBe(10);
  });

  it('devuelve el final en t=1', () => {
    expect(lerp(10, 20, 1)).toBe(20);
  });

  it('devuelve el punto medio en t=0.5', () => {
    expect(lerp(0, 100, 0.5)).toBe(50);
  });
});

describe('findClosestIndex', () => {
  it('encuentra la coincidencia exacta', () => {
    expect(findClosestIndex([0, 10, 20, 30], 20)).toBe(2);
  });

  it('encuentra el más cercano entre valores', () => {
    const idx = findClosestIndex([0, 10, 20, 30], 15);
    expect(idx).toBe(2);
  });

  it('devuelve 0 para un valor inferior al rango', () => {
    expect(findClosestIndex([10, 20, 30], 5)).toBe(0);
  });
});

describe('interpolateAtMET', () => {
  const mets = [0, 100, 200, 300];
  const xs = [0, 10, 20, 30];
  const ys = [0, 0, 0, 0];
  const zs = [0, 5, 10, 15];

  it('devuelve el primer punto en t=0', () => {
    const result = interpolateAtMET(mets, xs, ys, zs, 0);
    expect(result.x).toBeCloseTo(0);
  });

  it('devuelve el último punto en el TEM máximo', () => {
    const result = interpolateAtMET(mets, xs, ys, zs, 300);
    expect(result.x).toBeCloseTo(30);
  });

  it('interpola el punto medio correctamente', () => {
    const result = interpolateAtMET(mets, xs, ys, zs, 150);
    expect(result.x).toBeCloseTo(15);
    expect(result.z).toBeCloseTo(7.5);
  });
});

describe('moonPositionAtMET', () => {
  it('comienza en el eje +X en T=0', () => {
    const pos = moonPositionAtMET(0);
    expect(pos.x).toBeCloseTo(EARTH_MOON_DISTANCE, 1);
    expect(pos.y).toBeCloseTo(0, 5);
    expect(pos.z).toBeCloseTo(0, 5);
  });

  it('siempre a la distancia correcta de la Tierra', () => {
    const testMETs = [0, 86400, 7 * 86400, 27 * 86400];
    testMETs.forEach(met => {
      const pos = moonPositionAtMET(met);
      const dist = distance3D(0, 0, 0, pos.x, pos.y, pos.z);
      expect(dist).toBeCloseTo(EARTH_MOON_DISTANCE, 1);
    });
  });
});

describe('getMissionPhase', () => {
  it('devuelve LANZAMIENTO en T+0', () => {
    expect(getMissionPhase(0)).toBe('LANZAMIENTO');
  });

  it('devuelve VUELO DE IDA tras la TLI', () => {
    // TLI en T+1h57m (7020s). Tras esto, VUELO DE IDA hasta T+4d18h37m.
    expect(getMissionPhase(8000)).toBe('VUELO DE IDA');
    expect(getMissionPhase(86400)).toBe('VUELO DE IDA');
  });

  it('devuelve SOBREVUELO LUNAR durante la máxima aproximación', () => {
    const closestApproach = 5 * 86400 + 19 * 3600 + 2 * 60;
    expect(getMissionPhase(closestApproach)).toBe('SOBREVUELO LUNAR');
  });

  it('devuelve REENTRADA al final de la misión', () => {
    const reentry = 9 * 86400 + 6 * 3600 + 30 * 60;
    expect(getMissionPhase(reentry)).toBe('REENTRADA');
  });

  it('devuelve AMERIZAJE al concluir', () => {
    // Amerizaje en T+9d7h10m = 803400s; todo lo posterior es AMERIZAJE
    expect(getMissionPhase(803400)).toBe('AMERIZAJE');
    expect(getMissionPhase(900000)).toBe('AMERIZAJE');
  });
});

describe('Constantes', () => {
  it('el radio terrestre es ~6,371 unidades (1.000 km cada una)', () => {
    expect(EARTH_RADIUS_UNITS).toBeCloseTo(6.371, 2);
  });

  it('el radio lunar es ~1,737 unidades', () => {
    expect(MOON_RADIUS_UNITS).toBeCloseTo(1.7374, 3);
  });

  it('la distancia Tierra-Luna es ~384,4 unidades', () => {
    expect(EARTH_MOON_DISTANCE).toBeCloseTo(384.4, 1);
  });
});
