# Guía de desarrollo

## Entorno

```bash
npm install
npm run dev          # compila el cliente y levanta http://localhost:3000
npm run dev:client   # en otra terminal: recompila src/client/ al guardar
```

`tsx watch` reinicia el servidor cuando cambia el backend. Los cambios en el cliente
(`src/client/`) los recompila `dev:client`, y los de `public/` (HTML y CSS) no necesitan nada: en
los dos casos basta con recargar el navegador.

## Tests

```bash
npm test
```

Vitest corre `tests/**/*.test.ts` en entorno Node:

| Archivo | Qué cubre |
|---------|-----------|
| `tests/orbital-math.test.ts` | Funciones de `src/lib/orbital-math.ts`: MET, distancias, interpolación, posición lunar y fases |
| `tests/trajectory.test.ts` | Generación de la trayectoria: inicio y fin en la Tierra sin cruzarla, MET creciente, valores válidos, interpolación y sincronía con los eventos del sobrevuelo y la reentrada |

El frontend no tiene tests automatizados; su red de seguridad es la compilación estricta
(`npm run build:client`).

## Build de producción

```bash
npm run build   # compila el servidor a dist/ y el cliente a dist/public/
npm start       # node dist/server.js
```

`dist/` está en `.gitignore`. El servidor compilado sirve `public/` desde la raíz del proyecto y
el cliente desde `dist/public/`, así que en el despliegue hacen falta `dist/`, `public/`,
`package.json` y las dependencias de producción (`npm ci --omit=dev`).

## Flujo de trabajo con git

- La rama por defecto es `main`; la de integración es `develop`.
- Cada cambio va en su propia rama desde `develop`, con el formato `tipo/<ticket>-<slug>` o
  `tipo/<slug>` (por ejemplo `feat/vista-orion` o `fix/fase-reentrada`), y entra por PR.
- Commits con el formato `tipo(scope): descripción`, en español y en minúscula. Tipos: `feat`,
  `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `style`, `revert`.
- Antes de commitear corre `npm test`.

## Agregar un evento

1. Agrega el objeto en `src/data/events.ts`, en orden cronológico:

   ```typescript
   {
     id: 'id-unico',
     title: 'Título del evento',
     met: '005:19:07:00',          // DDD:HH:MM:SS
     description: 'Qué pasó y por qué importa.',
     phase: 'SOBREVUELO LUNAR',
     icon: '📡',
   }
   ```

2. Si quieres que la tripulación comente el evento, agrega una entrada con el mismo `id` en
   `CREW_DIALOGUE` de `src/client/crew-dialogue.ts`:

   ```typescript
   'id-unico': [
     ['koch', 'Primera línea del diálogo.'],
     ['hansen', 'Respuesta.'],
   ],
   ```

   Los hablantes válidos son `wiseman`, `glover`, `koch` y `hansen`; cualquier otro no compila.

3. Si el evento abre una fase nueva, ajusta `getMissionPhase()` en `src/lib/orbital-math.ts` y sus
   tests.

`/api/events/upcoming` asume que la lista está ordenada por MET.

## Cambiar la trayectoria

Los puntos de control están en `WAYPOINTS` (`src/lib/trajectory.ts`), cada uno como
`[met_segundos, x, y, z]` en miles de km. Reglas:

- El MET debe ser creciente.
- El primer y el último punto deben quedar sobre la superficie terrestre (a `EARTH_RADIUS_UNITS`
  del origen), y ningún tramo debe cruzar la Tierra.
- Los MET de los waypoints del sobrevuelo, de la separación del SM y de la reentrada deben
  coincidir con los de sus eventos en `src/data/events.ts`.
- Corre `npm test`: `tests/trajectory.test.ts` valida que el MET sea creciente, que la trayectoria
  empiece y termine en la Tierra sin cruzarla, y que la máxima aproximación a la Luna (~6.545 km) y
  la distancia máxima a la Tierra caigan en el MET de sus eventos.

## Cargar datos reales de la NASA

Cuando la NASA publique las efemérides reales de Artemis II:

1. Reemplaza `WAYPOINTS` en `src/lib/trajectory.ts` con los datos reales. Pasa de km a unidades de
   escena dividiendo entre 1.000.
2. Actualiza los MET de `src/data/events.ts` con los tiempos reales de la misión.
3. Agrega texturas reales en `src/client/app.ts`: NASA Blue Marble (2048×1024) para la Tierra y el
   mosaico global LRO WAC para la Luna, desde https://visibleearth.nasa.gov/.

## Convenciones de la escena 3D

Las convenciones visuales (escala, colores, opacidades, cámaras) están en
`.claude/skills/scene-conventions/SKILL.md` y en la sección de coordenadas de
[arquitectura.md](arquitectura.md).
