/**
 * Artemis II free-return trajectory generator.
 * Produces a smooth, visually convincing figure-8 path around Earth and Moon.
 * Units: 1 unit = 1000 km. Earth at origin (0,0,0). Moon at ~(384, 0, 0) at T+0.
 */

import {
  TrajectoryPoint,
  MoonPosition,
} from '../types.js';
import {
  EARTH_RADIUS_UNITS,
  MOON_RADIUS_UNITS,
  EARTH_MOON_DISTANCE,
  TOTAL_MISSION_SECONDS,
  distance3D,
  getMissionPhase,
  formatMET,
  catmullRom,
} from './orbital-math.js';

// Control waypoints: [met_seconds, x, y, z]
// Earth at (0,0,0), Moon fixed at (384.4, 0, 0) for trajectory definition
const WAYPOINTS: Array<[number, number, number, number]> = [
  // Launch and ascent
  [0,          0,      0,     EARTH_RADIUS_UNITS],  // T+0: Launch (KSC, Florida)
  [120,        0.5,    0,     8],                    // T+2min: SRB Sep, climbing
  [510,        2,      0,     18],                   // T+8.5min: Core stage sep
  [1080,       4,      0,     22],                   // T+18min: Perigee raise
  [7020,       12,     0,     28],                   // T+1h57min: TLI burn, leaving LEO
  // Outbound coast - curving upward and out
  [14400,      35,     5,     60],                   // T+4h: Outbound coast
  [86400,      90,     12,    120],                  // T+1d: Day 1 coast
  [172800,     175,    18,    160],                  // T+2d: Day 2 coast
  [259200,     265,    12,    140],                  // T+3d: Day 3 coast
  [302400,     315,    5,     90],                   // T+3.5d: Approaching lunar sphere
  // Lunar approach
  [410400,     365,    -2,    40],                   // T+4d18h: Lunar sphere entry
  [460800,     378,    -8,    12],                   // T+5d8h: Near Moon approach
  // Lunar flyby - behind the Moon (far side from Earth)
  [477180,     386,    -10,   0],                    // T+5d18.5h: Loss of signal
  [478020,     391.5,  -8,    -4],                   // T+5d19h: Closest approach
  [478440,     393,    -5,    -8],                   // T+5d19h7min: Max distance
  [479100,     391,    0,     -12],                  // T+5d19.4h: AOS + Earthrise angle
  [480000,     388,    5,     -15],                  // T+5d21h: Solar eclipse/return start
  // Return coast - curving back toward Earth
  [525600,     360,    8,     -30],                  // T+6d2h: Exiting lunar influence
  [561600,     310,    5,     -50],                  // T+6d12h: Return coast day 6
  [648000,     230,    2,     -70],                  // T+7d12h: Mid-course day 7
  [734400,     135,    0,     -55],                  // T+8d12h: Inbound day 8
  [777600,     60,     -3,    -30],                  // T+9d: Final approach
  // Reentry
  [795600,     5,      0,     -12],                  // T+9d6h: SM separation
  [797400,     1,      0,     -8],                   // T+9d6.5h: Reentry interface
  [803400,     0,      0,     EARTH_RADIUS_UNITS],   // T+9d7h10m: Splashdown
];

/**
 * Generate smooth trajectory using Catmull-Rom splines through waypoints
 */
export function generateTrajectory(numPoints = 600): TrajectoryPoint[] {
  const points: TrajectoryPoint[] = [];
  const wp = WAYPOINTS;
  const n = wp.length;

  // For each pair of consecutive waypoints, generate sub-points
  const totalSegments = n - 1;
  const pointsPerSegment = Math.ceil(numPoints / totalSegments);

  for (let seg = 0; seg < totalSegments; seg++) {
    const i0 = Math.max(0, seg - 1);
    const i1 = seg;
    const i2 = seg + 1;
    const i3 = Math.min(n - 1, seg + 2);

    const p0 = [wp[i0][1], wp[i0][2], wp[i0][3]];
    const p1 = [wp[i1][1], wp[i1][2], wp[i1][3]];
    const p2 = [wp[i2][1], wp[i2][2], wp[i2][3]];
    const p3 = [wp[i3][1], wp[i3][2], wp[i3][3]];

    const metStart = wp[i1][0];
    const metEnd = wp[i2][0];

    const count = seg === totalSegments - 1 ? pointsPerSegment : pointsPerSegment - 1;
    for (let k = 0; k < count; k++) {
      const t = k / (pointsPerSegment - 1);
      const pos = catmullRom(p0, p1, p2, p3, t);
      const met = metStart + (metEnd - metStart) * t;

      const x = pos[0];
      const y = pos[1];
      const z = pos[2];

      const dist_earth = distance3D(x, y, z, 0, 0, 0);
      // Moon is fixed at (384.4, 0, 0) for trajectory definition
      const dist_moon = distance3D(x, y, z, EARTH_MOON_DISTANCE, 0, 0);
      const phase = getMissionPhase(met);

      points.push({ met, x, y, z, dist_earth, dist_moon, velocity: 0, phase });
    }
  }

  // Calculate velocities using finite differences
  for (let i = 0; i < points.length; i++) {
    const prev = i > 0 ? points[i - 1] : points[i];
    const next = i < points.length - 1 ? points[i + 1] : points[i];

    const dt = (next.met - prev.met) / 3600; // hours
    if (dt === 0) {
      points[i].velocity = 0;
      continue;
    }

    const dx = (next.x - prev.x) * 1000; // convert to km
    const dy = (next.y - prev.y) * 1000;
    const dz = (next.z - prev.z) * 1000;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    points[i].velocity = Math.round(dist / dt); // km/h
  }

  // Ensure velocity is never negative or NaN
  for (const pt of points) {
    if (!isFinite(pt.velocity) || pt.velocity < 0) pt.velocity = 0;
  }

  return points;
}

/**
 * Interpolate a trajectory point at a given MET (seconds)
 */
export function getTrajectoryAtMET(
  trajectory: TrajectoryPoint[],
  targetMET: number
): TrajectoryPoint {
  if (targetMET <= trajectory[0].met) return { ...trajectory[0] };
  const last = trajectory[trajectory.length - 1];
  if (targetMET >= last.met) return { ...last };

  // Binary search for the segment
  let lo = 0, hi = trajectory.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (trajectory[mid].met <= targetMET) lo = mid;
    else hi = mid;
  }

  const a = trajectory[lo];
  const b = trajectory[hi];
  const span = b.met - a.met;
  const t = span === 0 ? 0 : (targetMET - a.met) / span;

  const lerp = (x: number, y: number) => x + (y - x) * t;

  return {
    met: targetMET,
    x: lerp(a.x, b.x),
    y: lerp(a.y, b.y),
    z: lerp(a.z, b.z),
    dist_earth: lerp(a.dist_earth, b.dist_earth),
    dist_moon: lerp(a.dist_moon, b.dist_moon),
    velocity: lerp(a.velocity, b.velocity),
    phase: getMissionPhase(targetMET),
  };
}

export {
  EARTH_RADIUS_UNITS,
  MOON_RADIUS_UNITS,
  EARTH_MOON_DISTANCE,
  TOTAL_MISSION_SECONDS,
};
