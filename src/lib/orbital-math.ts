/**
 * Orbital math utilities for Artemis II Mission Tracker.
 * Units: 1 unit = 1000 km, time in seconds.
 */

export const EARTH_RADIUS_UNITS = 6.371;       // Earth radius in 1000 km
export const MOON_RADIUS_UNITS = 1.7374;        // Moon radius in 1000 km
export const EARTH_MOON_DISTANCE = 384.4;       // Earth-Moon distance in 1000 km
export const TOTAL_MISSION_SECONDS = 803_400;   // 9d 7h 10m (splashdown)

/**
 * Convert Mission Elapsed Time (seconds) to formatted string DDD:HH:MM:SS
 */
export function formatMET(seconds: number): string {
  const s = Math.floor(Math.abs(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(days).padStart(3, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parse MET string "DDD:HH:MM:SS" to seconds
 */
export function parseMET(met: string): number {
  const parts = met.split(':').map(Number);
  if (parts.length === 4) {
    return parts[0] * 86400 + parts[1] * 3600 + parts[2] * 60 + parts[3];
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Distance between two 3D points in 1000 km units
 */
export function distance3D(
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number
): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Cubic Hermite spline interpolation between two points with tangents
 */
export function hermiteInterp(
  p0: number[], p1: number[],
  m0: number[], m1: number[],
  t: number
): number[] {
  const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
  const h10 = t ** 3 - 2 * t ** 2 + t;
  const h01 = -2 * t ** 3 + 3 * t ** 2;
  const h11 = t ** 3 - t ** 2;
  return p0.map((_, i) => h00 * p0[i] + h10 * m0[i] + h01 * p1[i] + h11 * m1[i]);
}

/**
 * Catmull-Rom spline segment interpolation (uses 4 control points)
 * Returns a point along the segment between p1 and p2
 */
export function catmullRom(
  p0: number[], p1: number[], p2: number[], p3: number[],
  t: number
): number[] {
  const t2 = t * t;
  const t3 = t2 * t;
  return p0.map((_, i) => {
    const a = -0.5 * p0[i] + 1.5 * p1[i] - 1.5 * p2[i] + 0.5 * p3[i];
    const b = p0[i] - 2.5 * p1[i] + 2 * p2[i] - 0.5 * p3[i];
    const c = -0.5 * p0[i] + 0.5 * p2[i];
    const d = p1[i];
    return a * t3 + b * t2 + c * t + d;
  });
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Find the index in a sorted array closest to a value (binary search)
 */
export function findClosestIndex(arr: number[], value: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Interpolate trajectory point at given MET using nearby points
 */
export function interpolateAtMET(
  mets: number[],
  xs: number[], ys: number[], zs: number[],
  targetMET: number
): { x: number; y: number; z: number } {
  if (targetMET <= mets[0]) return { x: xs[0], y: ys[0], z: zs[0] };
  const last = mets.length - 1;
  if (targetMET >= mets[last]) return { x: xs[last], y: ys[last], z: zs[last] };

  const idx = findClosestIndex(mets, targetMET);
  const i = Math.max(0, idx - 1);
  const j = Math.min(last, i + 1);

  const span = mets[j] - mets[i];
  const t = span === 0 ? 0 : (targetMET - mets[i]) / span;

  return {
    x: lerp(xs[i], xs[j], t),
    y: lerp(ys[i], ys[j], t),
    z: lerp(zs[i], zs[j], t),
  };
}

/**
 * Get Moon position at a given MET.
 * Moon orbits Earth with a period of ~27.3 days.
 * At T+0, Moon is positioned at angle 0 (along +X axis).
 */
export function moonPositionAtMET(met: number): { x: number; y: number; z: number } {
  const MOON_PERIOD_SECONDS = 27.3 * 86400;
  const angle = (met / MOON_PERIOD_SECONDS) * 2 * Math.PI;
  return {
    x: EARTH_MOON_DISTANCE * Math.cos(angle),
    y: 0,
    z: EARTH_MOON_DISTANCE * Math.sin(angle),
  };
}

/**
 * Determina la fase de misión a partir del MET en segundos.
 * METs clave (segundos):
 *   TLI: 7020  |  Entrada ESI lunar: 412620  |  PDS: 499440
 *   Máx. aproximación: 500520  |  ADS: 501900  |  Sep. SM: 799200
 *   Reentrada: 801000  |  Amerizaje: 803400
 */
export function getMissionPhase(met: number): string {
  if (met < 120)     return 'LANZAMIENTO';
  if (met < 510)     return 'SEPARACIÓN SRB';
  if (met < 1080)    return 'ASCENSO';
  if (met < 7200)    return 'ÓRBITA DE ESTACIONAMIENTO';
  if (met < 412620)  return 'VUELO DE IDA';
  if (met < 460560)  return 'APROXIMACIÓN LUNAR';
  if (met < 477900)  return 'ESFERA DE INFLUENCIA LUNAR';
  if (met < 499440)  return 'OBSERVACIÓN LUNAR';
  if (met < 501900)  return 'SOBREVUELO LUNAR';
  if (met < 506100)  return 'ADQUISICIÓN DE SEÑAL';
  if (met < 509700)  return 'ECLIPSE SOLAR';
  if (met < 566700)  return 'VUELO DE REGRESO';
  if (met < 799200)  return 'APROXIMACIÓN TERRESTRE';
  if (met < 801000)  return 'APROXIMACIÓN FINAL';
  if (met < 803400)  return 'REENTRADA';
  return 'AMERIZAJE';
}
