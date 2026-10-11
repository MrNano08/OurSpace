# ❤️ Mi rincón de mangas · 0.8.0

## Auditoría y alcance

Se integró sobre el código real 0.7.0: React 19/Vite, NestJS 11/Express, TypeORM/MariaDB, autenticación por cookie y almacenamiento privado en disco. No se accedió al Debian ni a su base real. Si hay modificaciones posteriores en producción, conservarlas al integrar. Este proyecto no contiene cambios de ReservaCR.

La biblioteca es compartida exclusivamente entre las dos cuentas autorizadas. Quien crea una obra administra su ficha y archivos; ambos pueden leer. Estado, progreso y notas son independientes y privados por usuario. La sección conserva los márgenes, estilos generales y contraseñas desde cuatro caracteres.

Se agregan siete tablas (obras, volúmenes, capítulos, archivos, preferencias, progreso y notas), módulos propios de backend y componentes propios de frontend. La migración no altera las tablas anteriores. Los únicos puntos de integración son registro de entidades/servicios/rutas, configuración y navegación condicional. No se cambian las subidas de fotos/vídeos, Ver juntos ni faststart.

## Uso

1. Entra en **Mangas** (en móvil, en **Más → Mi rincón de mangas**). Crea una obra con título, categoría, descripción y enlaces opcionales. Después puedes editar su portada.
2. Agrega volúmenes si los necesitas, y capítulos con imágenes, un PDF o enlaces. Para imágenes, selecciona todas juntas: se ordenan por nombre con números naturales; puedes subirlas o bajarlas manualmente antes de guardar.
3. Pulsa **Guardar capítulo** para publicar sus archivos. Puedes editar, agregar capítulos y sustituir archivos. Quitar páginas o eliminar contenido exige confirmación. Eliminar una obra elimina también sus capítulos, progreso y notas de ambos: no es una papelera.
4. Abre el capítulo en vertical o por páginas. Elige dirección de lectura y ampliación. El PDF se dibuja dentro de la aplicación, página a página.
5. **❤️ Continuar leyendo** abre el último capítulo y posición personal. En imágenes reordenadas, el progreso sigue el identificador de la página; si se sustituye esa página, se ajusta al rango disponible. En PDF se guarda el número de página, no el desplazamiento exacto dentro de ella.
6. Usa las notas de la obra o **Cuaderno libre**. Se guardan automáticamente; si hay edición simultánea, se conserva la versión del servidor y se permite guardar el borrador como otra nota.

Los estados pendiente, leyendo, terminado y favorito son alternativas de un mismo campo. La primera lectura cambia pendiente a leyendo; conserva un favorito existente. Buscar y ordenar se hace sobre el catálogo cargado. Los enlaces abren la página original y nunca se descargan ni extraen automáticamente.

## Actualización segura desde 0.7.0

1. Respalda la base MariaDB, la carpeta persistente de archivos, el código anterior y el `.env`. Conserva propietarios/permisos y confirma que el respaldo puede recuperarse. No sustituyas el `.env` por el ejemplo.
2. Comprueba Node `>=22.13.0` compatible con las dependencias y ejecuta la compilación en el directorio de la nueva entrega. No cambies Node globalmente en un servidor compartido sin comprobar las otras aplicaciones.
3. Comprueba como usuario del servicio `pdfinfo -v` y `prlimit --version`. La validación de PDF requiere **poppler-utils** y **util-linux** de Debian: son utilidades locales, no servicios nuevos. No se instalan automáticamente. Si faltan, planifica su instalación; las imágenes no dependen de ellas. Se mantienen FFmpeg/ffprobe necesarios para vídeos y pruebas.
4. Ejecuta `npm ci`, `npm run build` y `npm test`. La compilación copia recursos de PDF.js a `frontend/dist/pdfjs`; publica **todo** `frontend/dist`, incluidos esos recursos y el worker. No omitas esta carpeta ni cambies la política CSP de todo el sitio para permitir scripts externos.
5. Con una ventana de mantenimiento del servicio de Nuestro Espacio, conserva inicialmente `MANGAS_ENABLED=false` y ejecuta `npm run db:migrate`. **No ejecutes `db:seed`**, `synchronize` ni una reversión SQL destructiva. La versión 0.8.0 necesita la migración aplicada incluso si ocultas la sección.
6. Configura un directorio persistente exclusivo, por ejemplo:

```dotenv
MANGAS_ENABLED=false
MANGA_STORAGE_DIR=/var/lib/nuestro-espacio/mangas
MANGA_DELIVERY=node
MANGA_PDF_MAX_BYTES=104857600
```

La ruta debe ser absoluta y escribible por el usuario del backend. Los archivos se crean con permisos 0640 y la carpeta con 0750. Si omites la ruta, se usa una carpeta `mangas` hermana del almacenamiento de fotos. No la sitúes dentro de `frontend/dist`, código temporal ni un directorio público.

7. Para descargar sin pasar los bytes por Node, adapta **únicamente** las ubicaciones nuevas de `deploy/mangas.nginx.conf` al bloque HTTPS existente. Sustituye `PUERTO_NUESTRO_ESPACIO` por su puerto real y el alias por la ruta anterior. **No uses el puerto de ReservaCR ni reemplaces todo Nginx.** Dale al usuario de Nginx acceso de lectura mediante el grupo correcto, sin permisos públicos. Comprueba `nginx -t` antes de recargar. Solo después configura `MANGA_DELIVERY=nginx`.
8. El proxy existente puede limitar las subidas a menos de 100 MiB. El ejemplo establece 101 MiB únicamente para `/api/mangas/`; si aumentas el límite PDF, adapta ese límite también. Los uploads viajan en binario, no en JSON; no hace falta ampliar el límite JSON general.
9. Reinicia únicamente el servicio real de Nuestro Espacio. Activa `MANGAS_ENABLED=true`, reinicia y recarga la web cuando las comprobaciones estén listas. Revisa los casos de `VALIDACION_0.8.0.md` con ambos perfiles.

El modo predeterminado `node` permite probar sin modificar Nginx: autoriza y sirve rangos desde disco, aunque los bytes sí atraviesan el proceso. El modo `nginx` autoriza cada petición en Nest y entrega por X-Accel-Redirect a una ubicación **internal**. Comprueba que acceder directamente a `/_private_mangas/…` desde internet sea rechazado.

## Rendimiento, límites y costos

| Recurso | Comportamiento |
|---|---|
| Imágenes | JPG/JPEG/PNG/WebP estáticos; máximo 20 MiB y 32 megapíxeles por archivo. Se validan y normalizan a WebP sin metadatos. Las páginas se ajustan a 1920 × 12000 como máximo, sin ampliar, y después se codifican sin pérdida adicional. Por tanto, una imagen mayor puede reducir su resolución. Portadas: máximo 480 × 720, calidad 85. |
| PDF | 100 MiB predeterminados, configurable hasta 200 MiB; máximo 2000 páginas, sin contraseña. Se conserva el archivo, sin convertirlo en imágenes. `pdfinfo` tiene límites de 512 MiB, 15 s de CPU y 20 s de tiempo total. No es un antivirus ni una garantía sobre cualquier PDF arbitrario. |
| Biblioteca | Hasta 500 obras, 1000 capítulos por obra y 500 imágenes por capítulo. Hasta cinco enlaces por ficha/capítulo y 6000 caracteres por nota. |
| Subidas | Una por vez en cada interfaz y una validación/subida global de mangas por backend. Progreso, error y reintento con identificador idempotente. Se reintenta el archivo, no sus bytes parciales; no es una subida reanudable tras cerrar la página. Los vídeos conservan su mecanismo anterior. |
| Disco | Comprobación previa de tres veces el tamaño entrante más 1 GiB libre. No reserva espacio frente a otros procesos. Las imágenes temporales se sustituyen por su resultado validado. |
| Lectura | Imágenes cercanas al visor; las lejanas liberan su elemento de imagen. PDF.js solicita rangos de 256 KiB, sin precarga completa intencional y con un canvas por página limitado a 8 millones de píxeles. Algunos PDF requieren muchas partes del archivo para mostrar una página: no se garantiza un consumo constante para todo documento. |
| Dependencias | PDF.js 6.4.299, cargado solo al abrir PDF. Worker aproximado de 1,3 MB y módulo PDF de 0,5 MB sin comprimir; fuentes/mapas se descargan según necesidad. Sin nuevo servicio ni plan de pago. |
| Base | Lecturas al abrir catálogo, detalle, notas y capítulos; escrituras al editar/subir o guardar progreso/notas. No hay sondeo continuo del catálogo. Progreso tras 1,2 s sin cambios y reintento cada 15 s solo si está pendiente; notas tras 0,9 s y reintentos cuando hay cambios pendientes. Cada petición conserva las consultas de autenticación existentes. |
| Limpieza | Un temporizador horario solo cuando la función está activa. Retira archivos no referenciados con más de 24 h; recorre los registros por lotes de 200. No necesita otro daemon. Desactivar la función detiene esta limpieza. |

Los archivos subidos todavía sin guardar el capítulo son provisionales; no los dejes pendientes más de 24 horas. La eliminación revoca acceso en la base inmediatamente; la limpieza de disco es posterior. El período de limpieza **no permite recuperar desde la interfaz**. Incluye el nuevo directorio en tus respaldos.

El tráfico depende de los archivos realmente leídos por cada equipo y de las recargas: dos lectores descargan sus propios datos. Se usa la infraestructura existente; cualquier costo de tráfico/disco sigue dependiendo de tu proveedor. No se midió el consumo en tu Debian. Se conserva una instancia de backend; no se introduce coordinación para clústeres.

## Privacidad, fallos y limitaciones

- Autenticación y comprobación de origen existentes en todas las rutas; restricciones adicionales a las dos cuentas. Los UUID de archivos no otorgan acceso sin sesión. No hay distribución pública, extracción de ZIP ni importación automática de enlaces.
- Se comprueba contenido real de imágenes y PDF. Nombres del usuario no se usan como rutas; los archivos se identifican con UUID. PDF se sirve como adjunto, con CSP restrictiva; el lector dibuja canvas sin formularios, anotaciones activas ni ejecución de scripts del PDF.
- Progreso y notas pendientes usan almacenamiento local del navegador separado por usuario. Se reintentan al recuperar conexión y no sobrescriben automáticamente notas en conflicto. Estos borradores no están cifrados y pueden persistir en un equipo compartido: usa perfiles del navegador separados. Si borras datos del navegador, sus borradores no enviados se pierden.
- El lector permite volver aunque el guardado agote su espera de diez segundos; queda un borrador local. Sin conexión no se promete abrir capítulos o páginas que no estaban cargados. No es una aplicación descargable para lectura offline completa.
- PDF y zoom dependen del navegador/memoria del dispositivo. No se ejecutaron pruebas en teléfonos físicos ni en Safari/iOS. No se afirma compatibilidad verificada con todos los PDF complejos.
- ZIP/CBZ quedan fuera de esta entrega; primero se priorizan formatos sin extracción de archivos comprimidos.

## Desactivar o revertir

Para desactivar: `MANGAS_ENABLED=false`, reiniciar el backend y recargar la web. Se oculta el acceso y las rutas de contenido dejan de estar disponibles; se conservan tablas, archivos y progreso. El resto de secciones sigue funcionando.

Para volver al código 0.7.0, conserva un respaldo y restaura su código y frontend compilado, manteniendo el `.env` y los archivos persistentes. **Deja las siete tablas nuevas**: el código anterior las ignora. La migración rechaza deliberadamente `down` para evitar borrar lecturas o notas. No elimines archivos ni restaures una base antigua por rutina, ya que perderías actividad posterior de otras secciones. Retira solo los bloques Nginx agregados si necesitas revertirlos, comprobando su configuración. Ninguna de estas operaciones se ejecutó en tu servidor.
