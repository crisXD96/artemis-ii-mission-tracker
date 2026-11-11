# Guía de desarrollo

## Entorno

```bash
npm install
npm run dev     # http://localhost:3000, se reinicia al guardar cambios en src/
```

`tsx watch` solo vigila el backend. Los cambios en `public/` no requieren reiniciar: basta con
recargar el navegador.

## Tests

```bash
npm test
```

Vitest corre `tests/**/*.test.ts` en entorno Node:

| Archivo | Qué cubre |
|---------|-----------|
| `tests/orbital-math.test.ts` | Funciones de `src/lib/orbital-math.ts`: MET, distancias, interpolación, posición lunar y fases |
| `tests/trajectory.test.ts` | Generación de la trayectoria: inicio y fin en la Tierra, MET creciente, paso cerca de la Luna, valores válidos e interpolación |

El frontend no tiene tests automatizados.

## Build de producción

```bash
npm run build   # compila src/ a dist/
npm start       # node dist/server.js
```

`dist/` está en `.gitignore`. El servidor compilado sigue sirviendo `public/` desde la raíz del
proyecto, así que en el despliegue hacen falta `dist/`, `public/`, `package.json` y las
dependencias de producción (`npm ci --omit=dev`).

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
   `CREW_DIALOGUE` de `public/js/crew-dialogue.js`:

   ```javascript
   'id-unico': [
     ['koch', 'Primera línea del diálogo.'],
     ['hansen', 'Respuesta.'],
   ],
   ```

   Los hablantes válidos son `wiseman`, `glover`, `koch` y `hansen`.

3. Si el evento abre una fase nueva, ajusta `getMissionPhase()` en `src/lib/orbital-math.ts` y sus
   tests.

`/api/events/upcoming` asume que la lista está ordenada por MET.

## Cambiar la trayectoria

Los puntos de control están en `WAYPOINTS` (`src/lib/trajectory.ts`), cada uno como
`[met_segundos, x, y, z]` en miles de km. Reglas:

- El MET debe ser creciente.
- El primer y el último punto deben quedar sobre la superficie terrestre (`z = EARTH_RADIUS_UNITS`).
- Si mueves los waypoints del sobrevuelo lunar, revisa que coincidan con los MET de los eventos
  (ver "Limitaciones conocidas" en [arquitectura.md](arquitectura.md)).
- Corre `npm test`: `tests/trajectory.test.ts` valida que el MET sea creciente, que la trayectoria
  empiece y termine en la Tierra y que pase a menos de 30 unidades de la Luna.

## Cargar datos reales de la NASA

Cuando la NASA publique las efemérides reales de Artemis II:

1. Reemplaza `WAYPOINTS` en `src/lib/trajectory.ts` con los datos reales. Pasa de km a unidades de
   escena dividiendo entre 1.000.
2. Actualiza los MET de `src/data/events.ts` con los tiempos reales de la misión.
3. Agrega texturas reales en `public/js/app.js`: NASA Blue Marble (2048×1024) para la Tierra y el
   mosaico global LRO WAC para la Luna, desde https://visibleearth.nasa.gov/.

## Convenciones de la escena 3D

Las convenciones visuales (escala, colores, opacidades, cámaras) están en
`.claude/skills/scene-conventions/SKILL.md` y en la sección de coordenadas de
[arquitectura.md](arquitectura.md).
