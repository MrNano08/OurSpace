# Videos · Nuestro espacio 0.6.0

## Qué incluye

Se integra con NestJS, React, TypeORM/MariaDB, sesiones y los dos perfiles existentes. No crea otro login. El permiso administrativo del módulo se configura por slug: `ronaldo` por defecto, `scarlet` o ambos. Ambos perfiles pueden mirar; solo los configurados pueden crear, editar, ordenar, subir y eliminar. No cambia permisos de fotos, tareas, mensajes ni otros módulos.

En escritorio aparece **Videos**; en móvil, **Más → Mis videos**. Usa el contenedor, márgenes y componentes de la aplicación. Los estilos nuevos están en `videos.css`; solo se añade desplazamiento interno a la navegación existente para acomodar la nueva pestaña en tabletas. `app.css` no se modificó.

1. Crea una carpeta con nombre, descripción y posición; agrega su imagen con **Portada**.
2. Abre la carpeta y pulsa **Video**. El destino se selecciona automáticamente.
3. Selecciona un MP4, título y descripción. Se agrega al final después de validarse.
4. Usa flechas arriba/abajo, arrastrar y soltar en escritorio o **Editar / mover → Posición** para organizarlo. Desde ese mismo formulario puedes cambiarlo de carpeta o dejarlo sin carpeta.
5. Agrega la miniatura con **Miniatura**. Las imágenes se convierten a WebP sin metadatos; los MP4 no se transforman ni pierden calidad.
6. El otro perfil puede reproducir, continuar y marcar favoritos. Cada uno conserva su progreso.

El buscador encuentra carpetas por nombre/descripción y videos por título/descripción, indicando su carpeta. Hay tarjetas de carpetas, favoritos y **Continuar viendo**. Las listas muestran 24 videos por tanda. **Continuar carpeta** selecciona el último video empezado y pendiente; si no hay ninguno, el primer no completado; si todos están completos, vuelve al primero.

El reproductor HTML5 ofrece controles nativos, tiempo restante, pantalla completa, anterior/siguiente, lista ordenada y preferencia de reproducción automática por perfil/navegador. El navegador puede exigir pulsar reproducir. El progreso se guarda cada 15 segundos, al pausar, cambiar, salir de la vista y cuando el navegador permite notificar que la página se oculta/cierra. Se marca completado al alcanzar 95 % o el final; **Desde el inicio** reinicia tiempo y estado. Se guarda en la base para continuar entre dispositivos.

## Datos y orden

Migración aditiva/reanudable: `Videos1791450000000` (sexta migración).

| Tabla | Propósito |
|---|---|
| `video_catalog` | Fila de revisión y bloqueo para serializar cambios del catálogo |
| `video_folders` | Nombre, descripción, portada, posición, fechas |
| `videos` | Título, descripción, carpeta opcional, miniatura, posición, duración, bytes, SHA-256, fechas |
| `video_uploads` | Subida pendiente, propietario, destino, avance confirmado, huella y fecha |
| `video_progress` | Segundos, porcentaje, completado y fecha por usuario/video |
| `video_favorites` | Relación usuario/video |

Cada video pertenece como máximo a una carpeta; `folderId = NULL` representa **Sin carpeta**. Solo `videos` contiene archivos completamente validados. Las subidas están separadas y no se publican en el catálogo.

Los cambios de orden toman un bloqueo de escritura de la fila `video_catalog` en MariaDB. Se recalculan posiciones consecutivas 1..N dentro de la transacción. Ediciones con una revisión obsoleta reciben 409 y deben recargarse. Al mover un video se normalizan origen y destino; su UUID, archivo, favoritos y progreso no cambian. La fecha o nombre del archivo no determinan el orden.

Eliminar una carpeta pide escribir ELIMINAR y ofrece una casilla inicialmente desmarcada para eliminar también sus videos. Por defecto se conservan al final de **Sin carpeta**. Eliminar un video también exige confirmación. La base revoca el acceso inmediatamente; los archivos sin referencia se limpian cuando tienen al menos una hora y pasa el mantenimiento. No confundir esa ventana de limpieza con una papelera recuperable. El mantenimiento se ejecuta cada hora y después de ciertas eliminaciones/reemplazos. Una transferencia ya autorizada puede terminar aunque se elimine el registro mientras se reproduce.

## Archivos privados y subida

```text
VIDEO_STORAGE_DIR/
  media/UUID.mp4
  images/UUID.webp
  partial/UUID.part
```

El cliente transmite bloques de hasta 8 MiB con su desplazamiento y progreso real de XMLHttpRequest. El backend escribe directamente al disco; no usa Multer ni buffers completos para los MP4. Cada bloque se sincroniza a disco antes de confirmar su avance. El máximo predeterminado es 20 GiB por archivo y tres subidas pendientes. Cada cliente transmite un bloque a la vez.

Al interrumpirse, se conserva lo confirmado y se recorta el bloque incompleto. **Administración → Subidas pendientes → Reanudar** permite seleccionar el mismo archivo; se comprueban nombre, tamaño, fecha y SHA-256 de su primer/último MiB. Esa huella ayuda a detectar una selección equivocada, no sustituye un hash completo del cliente. El SHA-256 del archivo completo se calcula en el servidor al finalizar y evita publicar copias idénticas. Si ya existe, se conserva el registro anterior y se informa de ello; no se mueve automáticamente de carpeta.

Los parciales caducan a los siete días sin bloques confirmados. Cancelar una subida elimina su parcial. Un archivo que no pasa validación queda pendiente para inspección/cancelación; no se publica. Los bytes no confirmados tras una caída se recortan al reanudar; una caída entre renombrar y confirmar la base también puede recuperarse al finalizar nuevamente.

Validación: extensión MP4, tamaño, estructura de átomos MP4 completa, `moov` antes de `mdat`, un flujo H.264, audio AAC si hay audio y duración positiva obtenida con ffprobe. No se decodifica cada cuadro: un archivo dañado internamente aún puede fallar durante la reproducción. No hay transcodificación, HLS, DASH ni procesamiento continuo. El hash completo implica una lectura adicional del HDD, limitada a una finalización a la vez en esta instancia. Esta versión está pensada para **una sola instancia del backend**, como el servicio systemd actual; no desplegar en clúster sin coordinar finalización y mantenimiento entre instancias.

Si un MP4 H.264/AAC no tiene faststart, prepara una copia **antes de subirla**, preferiblemente en tu computadora:

```bash
ffmpeg -i entrada.mp4 -map 0:v:0 -map '0:a:0?' -c copy -movflags +faststart salida.mp4
```

El comando copia los flujos; no convierte códecs incompatibles. No sobrescribe el original. Si el material usa HEVC u otro códec, conviértelo fuera del servidor antes de subirlo. Un archivo de dos horas puede exceder 20 GiB según su bitrate; ajusta el límite solo si hay espacio suficiente.

## Configuración

| Variable | Valor predeterminado / significado |
|---|---|
| `VIDEO_STORAGE_DIR` | Carpeta `videos` junto a la carpeta de fotos; usar ruta absoluta explícita en Debian |
| `VIDEO_ADMIN_SLUGS` | `ronaldo`; admite `scarlet` o `ronaldo,scarlet` |
| `VIDEO_MAX_BYTES` | `21474836480` (20 GiB); máximo configurable 100 GiB |
| `VIDEO_RESERVE_BYTES` | `1073741824` (1 GiB libre que no se consume en subidas) |
| `VIDEO_DOWNLOADS` | `false`; `true` habilita descarga del original |
| `VIDEO_DELIVERY` | `nginx` en producción; `node` en desarrollo/pruebas |

Desactivar descargas oculta el botón y bloquea el endpoint de descarga. No es DRM: una persona autorizada a reproducir recibe los bytes y puede guardarlos por otros medios.

`ffprobe` solo se requiere cuando se finaliza una subida. `ffmpeg` se usa en las pruebas para generar videos sintéticos. No se agregaron dependencias npm.

## Actualización en Debian desde 0.5.0

Antes de aplicar comandos, identifica el nombre real del servicio, usuario, ruta de código y ubicación persistente del HDD. Los ejemplos suponen la plantilla `/opt/nuestro-espacio`, usuario `nuestro-espacio` y Nginx `www-data`; adapta esos valores. No sustituir a ciegas archivos de configuración ni certificados.

1. Detén el servicio y respalda juntos MariaDB, `.env`, código anterior y la carpeta completa de fotos (incluyendo `assets`). Desde esta versión incluye también la carpeta completa de videos. Conserva respaldos fuera de rutas públicas. No ejecutes `db:seed`.
2. Extrae esta versión en una carpeta nueva. Conserva el `.env` existente y añade las variables anteriores. Configura explícitamente `VIDEO_STORAGE_DIR` con la ruta del HDD y `VIDEO_DELIVERY=nginx` en Debian cuando hayas aplicado el bloque interno de Nginx (en desarrollo directo usa `node`). No copies `dist` ni `node_modules` antiguos.
3. Instala utilidades del sistema, si faltan:

```bash
sudo apt-get update
sudo apt-get install ffmpeg acl
ffprobe -version
```

4. Crea las carpetas privadas en el HDD. Si usas otra ruta, debe coincidir en `.env`, el `alias` interno de Nginx y las rutas permitidas por systemd. Verifica el montaje real con `findmnt -T /var/lib/nuestro-espacio` y espacio con `df -h`.

```bash
sudo install -d -m 2750 -o nuestro-espacio -g www-data /var/lib/nuestro-espacio/videos
sudo install -d -m 2750 -o nuestro-espacio -g www-data /var/lib/nuestro-espacio/videos/media
sudo install -d -m 2750 -o nuestro-espacio -g www-data /var/lib/nuestro-espacio/videos/images
sudo install -d -m 0700 -o nuestro-espacio -g nuestro-espacio /var/lib/nuestro-espacio/videos/partial
sudo setfacl -m u:www-data:--x /var/lib/nuestro-espacio
```

El directorio padre de estado usa 0700 en la plantilla. La ACL anterior concede a Nginx solo atravesarlo; no abre la galería de fotos. `media`/`images` usan setgid para que los nuevos archivos hereden el grupo de lectura de Nginx. El código fija los archivos publicados en 0640; `partial` es exclusivo del backend. No concedas acceso público a todas las fotos ni uses `chmod -R 777`. Comprueba nuevamente la ACL tras arrancar el servicio, porque systemd puede ajustar permisos del directorio de estado; si falta, vuelve a aplicar el permiso de paso y verifica.

Si `StateDirectory`/`ProtectSystem=strict` se mantienen, `/var/lib/nuestro-espacio` ya está autorizado. Para otro montaje, añade únicamente la ruta de videos a `ReadWritePaths`; conserva el resto de la unidad. No cambies el directorio de fotos existente.

5. Desde la raíz del nuevo proyecto, con el usuario propietario del código:

```bash
npm ci
npm run build
npm test
npm run db:migrate
```

Node debe cumplir `>=22.12.0`. Las pruebas son aisladas y no usan la base ni SMTP real. La migración usa el `.env` del backend y conserva las tablas anteriores. No actives `synchronize` ni borres la tabla de migraciones.

6. Adapta en tu sitio de Nginx los bloques nuevos de `deploy/nginx.conf`: `location ^~ /api/videos/` y `location ^~ /_private_videos/`. Conserva dominio, TLS, proxy y raíz reales. La ubicación de videos usa bloques de 9 MiB como máximo, sin buffering de solicitudes y con tiempo de validación ampliado. El límite previo de fotos sigue en 21 MiB. El backend autoriza la sesión y responde `X-Accel-Redirect`; el `internal` de Nginx entrega el archivo y los rangos. No hay alias público. Agrega `media-src 'self'` a tu CSP si ya defines una política.

```bash
sudo nginx -t
```

Solo si la validación es correcta, coloca el código compilado en la ruta real del servicio, confirma que Nginx apunta al nuevo `frontend/dist`, y ejecuta:

```bash
sudo systemctl daemon-reload
sudo systemctl start nuestro-espacio
sudo systemctl reload nginx
sudo systemctl status nuestro-espacio --no-pager
sudo journalctl -u nuestro-espacio -n 50 --no-pager
```

Revisa acceso del usuario de Nginx a un MP4 de prueba ya publicado con `sudo -u www-data test -r /ruta/real/media/UUID.mp4`. Un `Permission denied` requiere corregir grupo/permiso de paso del directorio, no abrir la ruta al público.

7. Abre la web y recarga con Ctrl+Shift+R. Comprueba ambos perfiles, contraseña de cuatro caracteres, márgenes y funcionalidades anteriores. Sube primero un MP4 pequeño de prueba; luego uno grande. Verifica portada, miniatura, carpetas, posiciones, favoritos, progreso y persistencia tras reiniciar.

## Verificar HTTP Range y privacidad en el servidor

En Herramientas de desarrollo → Red, reproduce y adelanta un video. La solicitud `/api/videos/UUID/file` con `Range: bytes=...` debe devolver `206`, `Content-Range` correcto, `Content-Type: video/mp4` y bytes coherentes. Una primera petición sin rango puede devolver `200`. No compartas el valor de la cookie.

La ruta `/_private_videos/media/UUID.mp4` abierta directamente debe devolver 404. Sin sesión, `/api/videos/UUID/file` debe devolver 401. Scarlet no debe poder hacer cambios administrativos con la configuración por defecto. Para probar una descarga, activa la opción y revisa el comportamiento de ambos perfiles. Desactivarla no impide copiar bytes de una reproducción autorizada.

## Verificación pendiente y límites

- Este ZIP no instala ni actualiza tu Debian. No se accedió a tu servidor ni a sus datos.
- Las pruebas automatizadas usan SQL.js y archivos temporales. El bloqueo real y las migraciones DDL deben validarse en una copia MariaDB antes de actualizar los únicos datos.
- Confirmar Nginx real, HTTP Range a través de TLS/proxy, permisos, límites, `systemd` y montaje del HDD.
- Prueba real en Android/iOS y navegador de la otra persona; autoplay y cierre de pestañas dependen del navegador.
- La prueba sintética de más de dos horas valida duración y formato, no dos horas de reproducción sostenida ni un archivo de múltiples GiB.
- Medir CPU/RAM, tiempos de subida/validación, Wi-Fi y respuesta de los demás módulos con un video real en tu Celeron. Una velocidad de Internet medida no garantiza reproducción continua.
- Biblioteca pensada para uso personal de dos perfiles: el catálogo obtiene sus metadatos en una respuesta; la presentación de videos se pagina en el cliente. Miles de videos pueden requerir paginación de servidor.
- El estado de completado persiste hasta reiniciarlo. Si dos dispositivos reproducen el mismo video a la vez, el último guardado confirmado determina el punto de reanudación.
- Un fallo de energía no puede garantizar el guardado de los últimos segundos de reproducción; los bloques de subida confirmados se sincronizan al disco.

## Archivos y API

Nuevos: `backend/src/videos/{entities,storage,videos.service,videos.controller}.ts`, `backend/src/database/migrations/1791450000000-videos.ts`, `backend/test/videos.test.ts`, `frontend/src/pages/Videos.tsx`, `frontend/src/components/videos/{types.ts,VideoUpload.tsx,VideoPlayer.tsx}`, `frontend/src/styles/videos.css`, esta guía y el informe de validación.

Modificados: registro de entidades/migraciones, `app.module.ts`, configuración opcional y `.env.example`, `App.tsx` (navegación), plantillas Nginx/systemd, versiones en manifests/lockfile, README, enlace de actualización y selección explícita de las primeras cuatro migraciones en la prueba histórica de 0.4.0. El CSS general, las contraseñas y los módulos anteriores no se reescribieron.

Todos los endpoints están bajo `/api/videos` y requieren la sesión existente; escrituras requieren el origen autorizado.

| Método y ruta | Uso |
|---|---|
| GET `/` | Catálogo, carpetas, progreso, favoritos y capacidades |
| GET `/disk` | Espacio total/disponible y bytes registrados; administrador |
| POST `/folders` | Crear carpeta |
| PATCH `/folders/:id` | Editar/reordenar; requiere revisión |
| DELETE `/folders/:id` | Confirmar y decidir conservación de videos |
| POST/DELETE `/images/:kind/:id` | Portada/miniatura (`kind`: folder o video) |
| GET `/images/:id` | Imagen privada vinculada |
| GET/POST `/uploads` | Pendientes / iniciar subida |
| GET/PUT/DELETE `/uploads/:id` | Avance / bloque binario / cancelar |
| POST `/uploads/:id/finish` | Validar y publicar; reintento idempotente |
| PATCH/DELETE `/:id` | Editar/mover/ordenar o eliminar video |
| GET/HEAD `/:id/file` | MP4 privado; `?download=1` solo si habilitado |
| PUT `/:id/progress` | Segundos, completado y reinicio del usuario |
| PUT `/:id/favorite` | Activar/desactivar favorito personal |

Consulta el esquema Zod del controlador para límites y cuerpos exactos. Los identificadores son UUID, las rutas físicas se derivan internamente y no se aceptan del navegador.

Referencias técnicas: [Nginx: X-Accel-Redirect](https://nginx.org/en/docs/http/ngx_http_proxy_module.html), [Nginx: internal, alias y max_ranges](https://nginx.org/en/docs/http/ngx_http_core_module.html), [Node.js: sistema de archivos](https://nodejs.org/api/fs.html).
