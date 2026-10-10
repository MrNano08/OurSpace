# Validación · Nuestro Espacio 0.7.0

## Alcance

Implementación sobre la fuente/ZIP 0.6.0 disponible. Pruebas locales aisladas, sin acceder al servidor Debian o a los datos del usuario. Se conservan las 66 pruebas originales y la cobertura añadida para la biblioteca de vídeos. No se declara validada una instalación real todavía.

## Automatizadas

`npm test`: **107 aprobadas, 0 fallidas, 0 omitidas** (Node 24, TypeScript, SQL.js, FFmpeg/ffprobe y archivos temporales). `npm run build`: backend y frontend compilados correctamente.

La suite nueva de sala comprueba ambos controles, avance/retroceso, entrada tardía, duplicados y desorden, conflicto simultáneo, desconexión/salida sin pausar al otro, reconexión, exclusión de segunda pestaña, buffering sin cambiar versión, caducidad de presencia/sala, duración máxima, membresía, UUID de sesión, autorización de perfiles, límites de ráfagas y ausencia de eco en instantáneas.

Las pruebas HTTP comprueban bandera desactivada con reproducción individual disponible, cookie/origen requeridos, vídeo existente, membresía propia, cuerpos inválidos y conflicto entre vídeos diferentes.

Faststart: posición de `moov` antes de `mdat`, duración/bytes/0640, deduplicación por original, limpieza del temporal, falta de espacio, fallo controlado de FFmpeg y reintento, caída después de publicar la copia antes de confirmar catálogo, y conservación de paquetes H.264/AAC con B-frames. La comparación SHA-256 de los paquetes codificados verifica que no se recodificaron; no sustituye probar todos los formatos posibles.

Las pruebas anteriores comprueban también sesiones/contraseñas, fotos, agenda, mensajes y otras funciones, orden y permisos del catálogo, subidas por bloques, progreso/favoritos, rangos HTTP, migraciones anteriores y limpieza. Usan SQL.js: no demuestran bloqueos concurrentes reales de MariaDB.

## Navegadores locales

Dos procesos Chromium independientes, dos cuentas distintas autenticadas con contraseña de cuatro caracteres, frontend Vite y backend Nest reales con base temporal:

| Caso | Resultado y alcance |
|---|---|
| Reproducir y pausar desde ambos | Aprobado; se esperó que el medio estuviera listo antes de controles consecutivos. |
| Adelantar y retroceder | Aprobado con el mismo archivo MP4. |
| Entrada tardía | Adopta la posición actual y reproducción del otro. |
| Duplicados/bucles | Un control produce un comando, y la recepción remota/latido no produce ecos; observación adicional de 16 s sin crecimiento de comandos. La suite de sala cubre duplicados/desorden. |
| Desconexión y retorno | Se desconectó una cuenta con emulación de red del navegador; aviso, controles individuales utilizables sin conexión, reconexión y recuperación del estado vigente. |
| Conexión limitada | 750 ms de latencia, 16 KB/s de descarga y 8 KB/s de subida simulados: play/pause convergen. El vídeo sintético ya estaba cargado; esto valida coordinación, no streaming largo con bitrate elevado. |
| Buffering | Evento `waiting` simulado no emite pausas/reproducciones falsas. No equivale a una prueba física de un HDD lento. |
| Autoplay | Se simuló rechazo `NotAllowedError` de `play()`; aparece el botón de gesto y se recupera la reproducción. |
| Pestaña oculta y retorno | Evento de visibilidad simulado y recuperación de estado. No equivale a bloquear un teléfono real. |
| Controles simultáneos | Convergencia al estado confirmado; rechazo 409 de la versión obsoleta cuando coinciden. |
| Salir | El otro sigue reproduciendo; quien sale puede pausar individualmente y recupera su velocidad previa. |
| Interfaz | Revisión visual móvil/escritorio y ausencia de desbordamiento horizontal en 320, 390, 768 y 1440 px. |

Se repitió aparte el recorrido individual con la bandera desactivada: login de cuatro caracteres, catálogo, carpeta, vídeo 1080p, reanudación, finalización, siguiente, creación de carpeta y subida completa desde el navegador. Sin errores de JavaScript. Anchos revisados: 320, 390, 580, 600, 768, 850, 1024, 1440, 1660 y 1920 px.

No se modificaron `app.css`, autenticación/validaciones de contraseñas, módulos de fotos/mensajes/planes, migraciones SQL ni plantillas Nginx/systemd. Se contrastaron contra el ZIP previo; cambios limitados al módulo de vídeos, registro/configuración, pruebas, versiones y documentación.

## Reproducir las pruebas de navegador opcionales

El runner incluido usa puertos locales 3000 y 5173, una base SQL.js y un directorio temporal propio. **Ejecutarlo en una máquina de pruebas con esos puertos libres**, no encima del servicio en producción. Usa configuración de prueba explícita, sin utilizar MariaDB ni almacenamiento real para su fixture.

Requiere FFmpeg, un Chromium compatible y Playwright suministrado en el entorno de QA; no se añadió Playwright a las dependencias de la aplicación. Tras `npm ci` y `npm run build`:

```bash
PLAYWRIGHT_MODULE=/ruta/al/modulo/playwright \
CHROMIUM_PATH=/ruta/al/ejecutable/chromium \
node scripts/test-watch-together.cjs
```

Si `playwright` es resoluble desde Node y su navegador ya está instalado, pueden omitirse esas variables. `KEEP_QA_ARTIFACTS=true` conserva capturas/fixture local e imprime su ruta. Por defecto se retiran al terminar. La suite normal `npm test` no necesita navegador.

## Comprobaciones obligatorias pendientes en el entorno real

1. Integrar sobre la versión real del servidor conservando cualquier ajuste posterior al ZIP; respaldos de código, `.env`, base y medios.
2. MariaDB real, permisos/rutas del HDD, acceso de Nginx tanto a un MP4 ya preparado como a uno convertido, proxy SSE sin buffering y Range 206 a través de TLS.
3. Ambos teléfonos/computadoras reales; Android/iOS, autoplay nativo, cambio de pestaña, bloqueo/desbloqueo, Wi-Fi/móvil y desconexión prolongada.
4. Un MP4 real grande durante preparación y dos espectadores, observando espacio libre, CPU, RAM, E/S, tiempos de respuesta de otras secciones y tráfico. No se midió el Celeron/HDD del usuario ni reproducción sostenida durante horas.
5. Revocar sesión, reiniciar el servicio, desactivar la bandera y comprobar retorno a reproducción individual, además del recorrido de fotos, recuerdos, mensajes y demás secciones.

Estas verificaciones no se marcan aprobadas. La función queda desactivada por defecto para permitir comprobar primero la actualización individual y activarla después, siguiendo [VER_JUNTOS.md](VER_JUNTOS.md).
