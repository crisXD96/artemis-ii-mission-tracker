# Arquitectura

El proyecto tiene dos partes que se comunican solo por HTTP:

- **Backend** (`src/`): un servidor Express en TypeScript que genera la trayectoria, guarda los
  datos de la misión y los expone como JSON en `/api/*`. También sirve los archivos de `public/`.
- **Frontend** (`public/`): HTML, CSS y JavaScript sin paso de build. Carga Three.js y Chart.js
  desde CDN con un `importmap`, pide los datos a la API al arrancar y hace toda la simulación
  visual en el navegador.

```
Navegador                                  Servidor (Express)
──────────                                 ──────────────────
index.html ──── GET /css, /js ───────────► express.static(public/)
app.js ─────── GET /api/trajectory ──────► routes/trajectory.ts ─► lib/trajectory.ts
       ─────── GET /api/events ──────────► routes/events.ts ─────► data/events.ts
       ─────── GET /api/crew ────────────► routes/crew.ts ───────► data/crew.ts
```

Cualquier otra ruta que no sea un archivo ni `/api/*` devuelve `index.html`.

## Backend

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/server.ts` | Arma la app Express: CORS, JSON, estáticos, rutas y el fallback a `index.html`. Puerto por `PORT` (3000 por defecto). |
| `src/types.ts` | Interfaces: `TrajectoryPoint`, `MissionEvent`, `CrewMember`, `TelemetrySnapshot`, `MoonPosition`. |
| `src/lib/orbital-math.ts` | Funciones puras: formato y parseo de MET, distancia 3D, interpolación (lineal, Hermite, Catmull-Rom), búsqueda binaria, posición de la Luna y fase de misión según el MET. |
| `src/lib/trajectory.ts` | Define los waypoints de control y genera la trayectoria. |
| `src/data/events.ts` | Los 26 eventos con su MET en texto `DDD:HH:MM:SS`; se convierten a segundos al cargar el módulo. |
| `src/data/crew.ts` | Los cuatro tripulantes con su biografía. |
| `src/routes/*.ts` | Un router por recurso. |

La trayectoria se genera **una vez al arrancar** y se queda en memoria; no hay base de datos.

### Modelo de la trayectoria

`generateTrajectory()` recorre 25 waypoints `[met, x, y, z]` que dibujan una figura de 8: salida
de la Tierra, paso por detrás de la Luna y regreso. Entre cada par de waypoints interpola con un
spline Catmull-Rom, que pasa exactamente por los puntos de control y da una curva suave.

Para cada punto calcula:

- `dist_earth`: distancia al origen (centro de la Tierra).
- `dist_moon`: distancia a la Luna **fija** en `(384.4, 0, 0)`. La trayectoria se define con la
  Luna quieta; su órbita solo se anima en la escena.
- `velocity`: diferencia finita centrada entre el punto anterior y el siguiente, en km/h.
- `phase`: fase de misión según `getMissionPhase(met)`.

Con el valor por defecto (`numPoints = 600`) salen **577 puntos**: el generador reparte
`ceil(600 / 24) = 25` puntos por segmento y no repite el punto compartido entre segmentos.

`getTrajectoryAtMET()` interpola linealmente entre los dos puntos que rodean un MET; es lo que usa
`/api/telemetry`.

### Reloj simulado

`routes/telemetry.ts` arranca su propio reloj al cargar el módulo: `/api/telemetry/current`
devuelve el MET transcurrido en tiempo real (1×) desde que arrancó el servidor, con tope en el
amerizaje. El frontend no lo usa: lleva su propio reloj con la línea de tiempo.

## Frontend

| Archivo | Responsabilidad |
|---------|-----------------|
| `public/index.html` | Estructura de la página: canvas, HUD, guía, panel de eventos, tooltip de tripulación y línea de tiempo. |
| `public/css/styles.css` | Tema visual (ver colores abajo) y diseño adaptable. |
| `public/js/app.js` | Escena Three.js (estrellas, Tierra con atmósfera, Luna, Sol, Orion, impacto de meteorito), líneas de trayectoria, cámaras, HUD, panel de eventos, línea de tiempo y bucle de animación. |
| `public/js/crew-dialogue.js` | Diálogo recreado por evento (las llaves son los `id` de `/api/events`) y el reproductor que lo va escribiendo en pantalla. |

Flujo de `app.js`:

1. `init()` crea la escena y pide `/api/trajectory`, `/api/events` y `/api/crew`.
2. Con esos datos arma la línea de trayectoria, el panel de eventos, las bandas de fase, las marcas
   de día y los marcadores de eventos de la línea de tiempo.
3. `animate()` corre en cada frame: avanza el MET según la velocidad elegida, interpola la posición
   de Orion, mueve la Luna en su órbita, actualiza HUD, eventos, tramos de trayectoria y cámara.

## Sistema de coordenadas

| Concepto | Valor |
|----------|-------|
| Unidades | 1 unidad = 1.000 km |
| Origen | Centro de la Tierra `(0, 0, 0)` |
| Eje Y | Arriba (norte de la eclíptica) |
| Luna en T+0 | Sobre +X, en `(384.4, 0, 0)` |
| Órbita lunar | Solo visual, periodo de 27,3 días |
| Orion | Ampliada ~500× para que se vea |
| Estrellas | Cáscara esférica entre r = 800 y 1.000 |

| Objeto | Tamaño real | Tamaño en escena |
|--------|-------------|------------------|
| Tierra | 12.742 km | radio 6,371 |
| Luna | 3.475 km | radio 1,737 |
| Distancia Tierra–Luna | 384.400 km | 384,4 |
| Orion | ~5 m | ~0,8 (500×) |

## Colores de la interfaz

| Color | Uso |
|-------|-----|
| `#00ff88` | Texto principal del HUD, elementos activos |
| `#1e3a5f` | Bordes de paneles, elementos inactivos |
| `#6b8fa8` | Etiquetas atenuadas |
| `#ff8c00` | Tramo actual de la trayectoria, avisos |
| `#0a0a0f` | Fondo, espacio profundo |

## Limitaciones conocidas

- **No es mecánica orbital real.** La trayectoria es un spline por puntos elegidos a mano para que
  se vea convincente.
- **Los waypoints y los eventos no están sincronizados.** En la trayectoria, la máxima
  aproximación a la Luna ocurre en el waypoint de MET 478.020 s (`005:12:47:00`), mientras que el
  evento y `getMissionPhase()` la ubican en 500.520 s (`005:19:02:00`). Por eso
  `/api/telemetry/478020` reporta la fase "OBSERVACIÓN LUNAR" estando a ~11.400 km de la Luna.
  Se corrige ajustando los MET de `WAYPOINTS` en `src/lib/trajectory.ts`.
- **La velocidad sale de la geometría del spline**, no de la física, y puede tener saltos en los
  cambios de segmento.
- **Dependencia de CDN.** Sin internet el navegador no carga Three.js y la escena no aparece.
