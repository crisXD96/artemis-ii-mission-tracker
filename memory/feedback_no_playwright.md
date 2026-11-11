---
name: No usar Playwright para verificaciones
description: El usuario no quiere que use Playwright para verificar el funcionamiento de la app
type: feedback
---

No usar Playwright (mcp__playwright__*) para verificar o probar la aplicación en el navegador.

**Why:** El usuario lo rechazó explícitamente al pedirme que no probara más con Playwright.

**How to apply:** Si necesito verificar que una app web funciona, confiar en los logs del servidor, las respuestas de la API con curl/fetch, y los tests unitarios. No abrir Playwright para tomar screenshots o interactuar con la UI.
