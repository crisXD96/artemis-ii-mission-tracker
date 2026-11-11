# Referencia de la API

Base: `http://localhost:3000/api`. Todas las respuestas son JSON y todos los endpoints son `GET`.
CORS está abierto, así que se pueden consumir desde otro origen.

**MET** (Mission Elapsed Time) es el tiempo desde el lanzamiento. En la API va en **segundos**;
`metFormatted` lo da como `DDD:HH:MM:SS`. La misión dura 803.400 s (`009:07:10:00`).

Las posiciones (`x`, `y`, `z`) y distancias (`dist_earth`, `dist_moon`) van en **miles de km**;
la velocidad, en **km/h**.

## `GET /api/trajectory`

Todos los puntos de la trayectoria, ordenados por MET (577 puntos).

```json
[
  {
    "met": 0,
    "x": 0, "y": 0, "z": 6.371,
    "dist_earth": 6.371,
    "dist_moon": 384.453,
    "velocity": 22695,
    "phase": "LANZAMIENTO"
  }
]
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `met` | number | Segundos desde el lanzamiento |
| `x`, `y`, `z` | number | Posición de Orion (miles de km, origen en la Tierra) |
| `dist_earth` | number | Distancia al centro de la Tierra (miles de km) |
| `dist_moon` | number | Distancia al centro de la Luna fija en `(384.4, 0, 0)` (miles de km) |
| `velocity` | number | Velocidad aproximada (km/h) |
| `phase` | string | Fase de misión |

## `GET /api/events`

Los 26 eventos de la misión, en orden cronológico.

```json
[
  {
    "id": "launch",
    "title": "Lanzamiento",
    "met": 0,
    "metFormatted": "000:00:00:00",
    "description": "Artemis II despega desde el Complejo de Lanzamiento 39B…",
    "phase": "LANZAMIENTO",
    "icon": "🚀"
  }
]
```

## `GET /api/events/upcoming?met=N`

Los 3 eventos siguientes cuyo MET es mayor o igual a `N` (segundos). Sin `met`, o con un valor no
numérico, usa 0.

```
GET /api/events/upcoming?met=478000
```

Devuelve `los` (`005:18:44:00`), `closest-approach` (`005:19:02:00`) y `max-distance`
(`005:19:07:00`), con el mismo formato que `/api/events`.

## `GET /api/telemetry/current`

Telemetría del MET simulado actual. El reloj arranca en 0 cuando se levanta el servidor, avanza en
tiempo real (1×) y se detiene en el amerizaje.

```json
{
  "met": 1.618,
  "x": 0.0034, "y": 0, "z": 6.3806,
  "dist_earth": 6.3806,
  "dist_moon": 384.4496,
  "velocity": 21890.854,
  "phase": "LANZAMIENTO",
  "metFormatted": "000:00:00:01"
}
```

## `GET /api/telemetry/:met`

Telemetría interpolada en un MET dado (segundos, admite decimales). Fuera del rango de la misión
devuelve el primer o el último punto.

```
GET /api/telemetry/478020
```

```json
{
  "met": 478020,
  "x": 391.5, "y": -8, "z": -4,
  "dist_earth": 391.602,
  "dist_moon": 11.420,
  "velocity": 33338,
  "phase": "OBSERVACIÓN LUNAR",
  "metFormatted": "005:12:47:00"
}
```

Errores:

| Caso | Respuesta |
|------|-----------|
| `:met` no es un número (`/api/telemetry/abc`) | `400 {"error": "Invalid MET value"}` |

## `GET /api/crew`

```json
[
  {
    "name": "Reid Wiseman",
    "role": "Comandante",
    "agency": "NASA",
    "bio": "Astronauta de la NASA y ex Jefe de la Oficina de Astronautas…"
  }
]
```

## Fases de misión

`phase` toma uno de estos valores según el MET (`getMissionPhase` en `src/lib/orbital-math.ts`):

| Desde (s) | Fase |
|-----------|------|
| 0 | LANZAMIENTO |
| 120 | SEPARACIÓN SRB |
| 510 | ASCENSO |
| 1.080 | ÓRBITA DE ESTACIONAMIENTO |
| 7.200 | VUELO DE IDA |
| 412.620 | APROXIMACIÓN LUNAR |
| 460.560 | ESFERA DE INFLUENCIA LUNAR |
| 477.900 | OBSERVACIÓN LUNAR |
| 499.440 | SOBREVUELO LUNAR |
| 501.900 | ADQUISICIÓN DE SEÑAL |
| 506.100 | ECLIPSE SOLAR |
| 509.700 | VUELO DE REGRESO |
| 566.700 | APROXIMACIÓN TERRESTRE |
| 799.200 | APROXIMACIÓN FINAL |
| 801.000 | REENTRADA |
| 803.400 | AMERIZAJE |
