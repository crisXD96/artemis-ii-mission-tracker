# Artemis II Mission Tracker

An interactive 3D simulator for the NASA Artemis II mission — the first crewed journey to lunar distance since Apollo 17. Launched April 1, 2026 from Kennedy Space Center, the Orion spacecraft carried four astronauts on a 9-day free-return trajectory around the Moon.

## Quick Start

```bash
npm install
npm run dev      # starts server at http://localhost:3000
npm test         # run Vitest tests
npm run build    # compile TypeScript to dist/
npm start        # run compiled build
```

## Project Structure

```
├── src/
│   ├── server.ts              # Express server, static files, API routes
│   ├── types.ts               # TypeScript interfaces (TrajectoryPoint, etc.)
│   ├── lib/
│   │   ├── orbital-math.ts    # Math utilities: MET, interpolation, distance
│   │   └── trajectory.ts      # Trajectory generator (Catmull-Rom spline)
│   ├── data/
│   │   ├── events.ts          # Mission timeline events (25 events)
│   │   └── crew.ts            # Crew member bios
│   └── routes/
│       ├── trajectory.ts      # GET /api/trajectory
│       ├── events.ts          # GET /api/events, /api/events/upcoming
│       ├── telemetry.ts       # GET /api/telemetry/current, /api/telemetry/:met
│       └── crew.ts            # GET /api/crew
├── public/
│   ├── index.html             # Single-page app shell
│   ├── css/styles.css         # Space UI theme
│   └── js/app.js              # Three.js scene + all frontend logic
├── tests/
│   ├── orbital-math.test.ts   # Unit tests for math utilities
│   └── trajectory.test.ts     # Integration tests for trajectory generation
└── vitest.config.ts
```

## 3D Coordinate System

- **Units**: 1 unit = 1,000 km
- **Origin**: Earth center (0, 0, 0)
- **Y-axis**: Up (ecliptic north)
- **Moon position at T+0**: Along +X axis at (384.4, 0, 0)
- **Moon orbit**: Visual only — orbits Earth in ~27.3 days
- **Orion scale**: Exaggerated ~500× real size for visibility
- **Star field**: Spherical shell at r=800–1000 units

### Scale reference
| Object | Real size | Rendered size |
|--------|-----------|---------------|
| Earth | 12,742 km | 12.742 units (radius 6.371) |
| Moon | 3,475 km | 3.475 units (radius 1.737) |
| Earth-Moon distance | 384,400 km | 384.4 units |
| Orion capsule | ~5 m diameter | ~0.8 units (500× exaggerated) |

## Mission Data

### Key Events
| MET | Event |
|-----|-------|
| 000:00:00:00 | Launch from KSC |
| 000:01:57:00 | Trans-Lunar Injection burn |
| 004:18:37:00 | Enter Moon's sphere of influence |
| 005:07:56:00 | Distance record (surpasses Apollo 13's 400,171 km) |
| 005:18:44:00 | Loss of Signal (behind Moon) |
| 005:19:02:00 | Closest approach (~6,545 km above surface) |
| 005:19:07:00 | Maximum distance from Earth (406,732 km) |
| 005:19:25:00 | Acquisition of Signal + Earthrise |
| 009:07:10:00 | Splashdown, Pacific Ocean |

### Trajectory
The trajectory is a simplified free-return figure-8 path generated with Catmull-Rom splines through 23 control waypoints. It is not orbital-mechanically precise but is visually convincing. The real trajectory data can be substituted when NASA publishes it.

## API Reference

| Endpoint | Description |
|----------|-------------|
| `GET /api/trajectory` | All 600 trajectory points with telemetry |
| `GET /api/events` | All 25 mission events |
| `GET /api/events/upcoming?met=N` | Next 3 events from given MET |
| `GET /api/telemetry/current` | Current simulated telemetry |
| `GET /api/telemetry/:met` | Telemetry at specific MET (seconds) |
| `GET /api/crew` | Crew member information |

## UI Color Conventions

| Color | Use |
|-------|-----|
| `#00ff88` | Primary HUD text, active elements |
| `#1e3a5f` | Panel borders, inactive elements |
| `#6b8fa8` | Dim labels |
| `#ff8c00` | Current trajectory segment, warnings |
| `#0a0a0f` | Background, deep space |

## Adding Events

Add new events in `src/data/events.ts`:

```typescript
{
  id: 'unique-id',
  title: 'Event Title',
  met: '005:19:07:00',   // DDD:HH:MM:SS
  description: 'What happened and why it matters.',
  phase: 'LUNAR FLYBY',
  icon: '📡',
}
```

## Contributing Real NASA Data

When NASA publishes the actual Artemis II trajectory data:

1. Replace the `WAYPOINTS` array in `src/lib/trajectory.ts` with real ephemeris data
2. Update event METs in `src/data/events.ts` with actual mission times
3. Add real texture URLs to `public/js/app.js` (NASA Visible Earth: https://visibleearth.nasa.gov/)
4. The coordinate system uses km units — convert from km to units by dividing by 1000

### NASA Texture Sources (when available)
- Earth: NASA Blue Marble (2048×1024 JPEG)
- Moon: LRO WAC Global Mosaic

## Crew

| Name | Role | Agency |
|------|------|--------|
| Reid Wiseman | Commander | NASA |
| Victor Glover | Pilot | NASA |
| Christina Koch | Mission Specialist 1 | NASA |
| Jeremy Hansen | Mission Specialist 2 | CSA |

Jeremy Hansen is the first Canadian to travel beyond low Earth orbit.
