export interface TrajectoryPoint {
  met: number;        // Mission Elapsed Time in seconds
  x: number;         // Position X in 1000 km units
  y: number;         // Position Y in 1000 km units
  z: number;         // Position Z in 1000 km units
  dist_earth: number; // Distance from Earth center in 1000 km
  dist_moon: number;  // Distance from Moon center in 1000 km
  velocity: number;   // Speed in km/h
  phase: string;      // Mission phase name
}

export interface MissionEvent {
  id: string;
  title: string;
  met: number;        // MET in seconds
  metFormatted: string;
  description: string;
  phase: string;
  icon: string;
}

export interface CrewMember {
  name: string;
  role: string;
  agency: string;
  bio: string;
}

export interface TelemetrySnapshot {
  met: number;
  metFormatted: string;
  dist_earth: number;
  dist_moon: number;
  velocity: number;
  phase: string;
  x: number;
  y: number;
  z: number;
}

export interface MoonPosition {
  x: number;
  y: number;
  z: number;
}
