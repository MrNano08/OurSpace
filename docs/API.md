# API de la entrega 0.5.0

Prefijo `/api`. JSON. Cookies de sesión. Las mutaciones exigen `Origin` igual a `WEB_ORIGIN`, incluyendo login y recuperación. No se aceptan identificadores de propietario proporcionados por el navegador.

| Método | Ruta | Acceso / contenido |
|---|---|---|
| GET | /health | Público, estado básico del proceso. No comprueba disponibilidad actual de DB. |
| GET | /auth/profiles | Público, id/slug/nombre/color; nunca email ni hashes. |
| POST | /auth/login | `{slug,password}`; emite cookie y devuelve perfil propio. |
| GET | /auth/me | Perfil de la sesión. |
| POST | /auth/logout | Revoca sesión actual. |
| POST | /auth/password | `{currentPassword,newPassword}`; revoca todas las sesiones y códigos. |
| POST | /auth/recovery | `{slug}`; envía código al correo fijo. |
| POST | /auth/reset | `{slug,code,newPassword}`; no inicia sesión automáticamente. |
| PATCH | /profile | `{name,accent}`. Colores `rose`, `sage`, `lavender`, `blue`. |
| GET | /tasks | `page=1`, `limit=20` (máximo 50), `completed=false`. Siempre privadas. |
| POST | /tasks | `{title,notes?,priority,dueAt?}`. Prioridad 1 baja, 2 media, 3 alta. |
| PATCH | /tasks/:id | Campos anteriores opcionales y/o `completed`. Solo propietario. |
| DELETE | /tasks/:id | Solo propietario. Elimina también sus notificaciones de tarea. |
| GET | /counters | Contadores donde la sesión es creadora o destinataria. |
| POST | /counters | `{label,emoji}`. Destinatario calculado en servidor. Máximo 20 por creador. |
| POST | /counters/:id/change | `{delta:1}` o `{delta:-1}`. Solo creador. Valor mínimo 0. |
| GET | /counters/:id/history | `page=1`, 30 cambios por página. Ambos participantes. |
| DELETE | /counters/:id | Solo creador. Elimina historial y notificación relacionada. |
| GET | /notifications | `page=1`, 30 por página; solo destinatario, excluye descartadas. |
| POST | /notifications/:id/dismiss | Solo destinatario. |

`dueAt` es un número de milisegundos Unix o `null`. No enviar fechas locales sin zona. El frontend convierte entradas de Costa Rica al instante correspondiente.

Las consultas paginadas devuelven `{items,total,page}`; tareas añade `limit`. Los listados de contadores y perfiles son arreglos acotados. El historial usa fecha e ID como orden estable.

Respuestas habituales: 400 validación, 401 sin sesión/credenciales incorrectas, 403 origen no autorizado o contraseña temporal sin cambiar, 404 recurso ajeno/inexistente, 429 límite de intentos, 503 correo no configurado/indisponible. Las rutas POST exitosas devuelven 201 según el comportamiento predeterminado de NestJS.

No existen endpoints de registro abierto, cambio de correo, eliminación de cuenta o acceso a tareas por otro usuario. El perfil con contraseña temporal solo puede consultar su sesión, cambiar contraseña o salir.

## Procesamiento interno

Cada 30 segundos el proceso revisa hasta 50 tareas vencidas no notificadas. Marca la tarea y crea la notificación en una transacción, con bloqueo de fila en MariaDB. Al reiniciarse, recupera tareas que vencieron mientras estuvo apagado. No hay notificaciones push ni conexión en tiempo real: el navegador consulta cada 30 segundos mientras está visible.

El historial de contadores y su valor se actualizan juntos bajo bloqueo. La recuperación y los cambios de contraseña bloquean la fila de usuario, invalidan sesiones y eliminan códigos. Los intentos y bloqueos se conservan en MariaDB al reiniciar. Se limpian sesiones/códigos/límites vencidos una vez por hora.


## Nuevos contratos 0.2.0

- Contraseña nueva o inicial: mínimo 4, máximo 128 caracteres. Recuperación conserva código de 6 dígitos. AUTH_SECRET no cambia su mínimo.
- Tareas aceptan `recurrence` (`none`, `daily`, `weekly`, `monthly`, `yearly`), `recurrenceUntil` (instante o null) y `email` (boolean). Si hay recurrencia o correo se exige `dueAt`. `nextTaskId` es administrado exclusivamente por el servidor. PATCH solo cambia los campos presentes.

| Método | Ruta | Contenido / acceso |
|---|---|---|
| GET | /agenda?from=MS&to=MS | Solo propietario; rango máximo 42 días. Devuelve `items` con `occurrenceAt`, `occurrenceEnd` y los campos de la serie. |
| POST | /agenda | `title`, `startsAt`, `endsAt`, `notes?`, `location?`, `recurrence?`, `recurrenceUntil?`, `alertMinutes?`, `email?`. |
| PATCH | /agenda/:id | Reemplaza los campos editables de la serie; requiere los mismos campos que POST. Solo propietario. |
| DELETE | /agenda/:id | Elimina evento y todas sus repeticiones. Solo propietario. |
| GET | /reminders/options | Indica `emailAvailable`; exige sesión. |
| GET | /reminders | `view=mine` (recibidos o propios) o `other` (creados para el otro), `completed=false`, `page=1`. 20 elementos por página. |
| POST | /reminders | `title`, `notes?`, `target=self|other`, `remindAt`, `email?`. Destinatario resuelto en el servidor. |
| POST | /reminders/:id/complete | Solo destinatario; repetición idempotente de la acción. |
| DELETE | /reminders/:id | Solo creador; elimina para ambos participantes. |

`alertMinutes`: null (sin aviso), 0, 5, 15, 30, 60 o 1440. Eventos con duración entre más de cero y 7 días. Fechas ingresadas por el frontend en Costa Rica; almacenamiento como instantes Unix.

La cola procesa hasta cinco trabajos por ciclo de 15 segundos. Cada trabajo se reserva con token y vencimiento de dos minutos; se recuperan trabajos abandonados. Cinco fallos de SMTP detienen reintentos y generan notificación interna. Un mensaje ya aceptado por SMTP puede duplicarse tras una caída antes de confirmar su resultado en BD. Los trabajos en cola son una instantánea del aviso cuando se creó.


## Nuevos contratos 0.3.0

Todos requieren sesión y, para mutaciones, origen autorizado. Destinatario resuelto en el servidor; no aceptar ownerId/targetId del cliente. Listados de 20 elementos por página con `{items,total,page}`.

| Método | Ruta | Contenido / acceso |
|---|---|---|
| GET | /messages | `view=conversation` o `scheduled`, `page=1`. Conversación: mensajes habilitados visibles para la sesión, recientes primero. Programados: únicamente propios, próxima entrega primero. |
| GET | /messages/:id | Contenido visible para la sesión. Un futuro no habilitado devuelve 404 al destinatario, aunque su fecha ya haya pasado. |
| POST | /messages | `body` (1–5000 caracteres tras trim), `deliverAt` (instante futuro o null/omitido para ahora). |
| PATCH | /messages/:id | `body`, `deliverAt` futuro. Solo creador y antes de habilitar. Conflicto 409 si ya está disponible para el otro. |
| POST | /messages/:id/cancel | Solo creador de un programado todavía no habilitado; lo elimina. Conflicto 409 si la entrega ya ganó la transacción. |
| DELETE | /messages/:id | Solo mensajes habilitados. Oculta a la sesión y elimina su aviso; no afecta la copia ajena. Purga al ocultarlo ambos. Repetir mientras existe la otra copia es idempotente. |
| GET | /petitions | `view=incoming` o `mine`, `status=all|pending|accepted|rejected|chance|maybe`, `page=1`. |
| GET | /petitions/:id | Ambos participantes. |
| POST | /petitions | `title` (1–120), `details` (opcional, máximo 3000). Estado inicial `pending`. |
| POST | /petitions/:id/respond | Solo destinatario. `status=accepted|rejected|chance|maybe`, `note` (opcional, máximo 1000). Reemplaza la respuesta actual. Misma respuesta/nota no repite el aviso. |
| DELETE | /petitions/:id | Solo creador. Elimina para ambos y limpia sus avisos. |

El DTO de mensaje contiene únicamente `id`, `ownerId`, `targetId`, `body`, `deliverAt` y `scheduled`. No incluye campos de lectura, marcas de eliminación del otro ni fecha interna de procesamiento. `scheduled` solo es verdadero en contenido accesible por el creador.

La entrega y la creación del aviso se confirman en la misma transacción, bajo bloqueo de fila en MariaDB. Se procesan 50 mensajes cada 15 segundos y al iniciar. Las consultas del destinatario exigen entrega habilitada y fecha alcanzada; la fecha sola no abre el contenido. Editar/cancelar y entregar bloquean la misma fila.

Las nuevas notificaciones usan `kind=message|petition` y `resourceId`. La interfaz abre el contenido mediante su GET autorizado. Abrirlo o cerrar el diálogo no marca lectura ni descarta automáticamente el aviso. Mensajes/peticiones no crean trabajos de correo. Al cambiar respuesta se reemplaza el aviso anterior para el creador, evitando acumular respuestas obsoletas.


## Galería 0.4.0

Todas las rutas exigen sesión; mutaciones también `Origin` autorizado. Solo creador y destinatario participan. Los archivos nunca se sirven desde una ruta estática.

| Método | Ruta | Contrato |
|---|---|---|
| GET | /gallery | `section=available|protected|upcoming`, `cursor?`. Devuelve `{items,nextCursor}`, 24 elementos, por `createdAt DESC, id DESC`. No devuelve total global ni carga todo el catálogo. |
| POST | /gallery | Multipart: un archivo `file` y un campo `metadata` que contiene JSON. Máximo 20 MiB, JPEG/PNG/WebP estáticos de hasta 40 MP. Se verifica contenido real. |
| GET | /gallery/:id | DTO autorizado o placeholder sin detalles privados. El creador puede ver sus propias fotos desde la incorporación. |
| GET | /gallery/:id/file/:variant | `variant=thumb|medium|original`. Sesión + pertenencia + acceso. 403 sin bytes de foto si está bloqueada; 404 si eliminada/ausente. Original como descarga. Respuesta privada sin almacenamiento en caché. |
| POST | /gallery/:id/unlock | `{password}` (4–128). Primero fecha, después contraseña. Cinco fallos → 429 durante 15 min por foto/cuenta. Persiste el permiso; no genera recibo de lectura. |
| PATCH | /gallery/:id | Solo creador. Reemplaza `description`, `location`, `album`, `tags`, `capturedAt`. No admite modificar contraseña/apertura/propietario. |
| DELETE | /gallery/:id | Solo creador. Inhabilita para ambos y limpia avisos, archivos y permisos. Reintenta limpieza física si falla. |

`metadata` acepta `description` (0–2000), `location` (0–200), `album` (0–80), `tags` (hasta 10 cadenas no vacías de máximo 40), `capturedAt` opcional, `password` (null o 4–128), `unlockAt` (null o instante Unix futuro). No acepta campos adicionales. Captura: cadena local `YYYY-MM-DDTHH:mm:ss` sin zona o null; omitida en subida busca EXIF. Apertura: milisegundos Unix, independiente de captura.

El DTO común contiene `id`, `ownerId`, `createdAt`, `unlockAt`, `protected`, `accessible`, `lockReason`. Si `accessible=false`, no hay detalles ni URL ni ruta del archivo. Si es verdadero añade descripción, lugar, álbum, etiquetas, fecha/fuente/offset de captura, dimensiones orientadas, bytes originales y formato. Nunca incluye hash, EXIF crudo, GPS automático, nombre original ni ruta de almacenamiento. `lockReason` describe la restricción para el destinatario y puede coexistir con `accessible=true` para el creador o un destinatario que ya desbloqueó.

La puerta de subida se adquiere antes de recibir el archivo multipart; otra subida simultánea en el mismo proceso obtiene 429 y `Retry-After: 5`. Los procesos externos/múltiples no comparten ese límite. Los errores de tamaño retornan 413, los de formato/validación 400. El cuerpo JSON general sigue limitado a 32 KiB; el multipart de galería tiene su límite separado.

Mantenimiento: cada 30 segundos hasta 50 avisos de apertura y 20 borrados físicos pendientes, bajo transacciones para los avisos. Una vez por hora se comprueban directorios huérfanos; solo se eliminan los de más de 24 h. Los avisos `kind=photo` contienen texto genérico y `resourceId`, sin detalles de la foto bloqueada.

## Colecciones, perfiles y planes 0.5.0

Todas estas rutas requieren sesión; las mutaciones también origen autorizado. `/auth/profiles` sigue siendo público y no devuelve avatar. El perfil propio agrega `avatarId` (UUID o null).

| Método | Ruta | Contrato |
|---|---|---|
| GET | /profiles | Perfiles públicos más `avatarId`, solo con sesión; sin correos ajenos ni hashes. |
| POST | /profile/avatar | Multipart `file`, sin otros campos. Devuelve perfil propio actualizado. |
| DELETE | /profile/avatar | Quita avatar propio y devuelve perfil actualizado. |
| GET | /assets/:id | WebP autorizado, sin caché; archivo vinculado vigente, nunca un ID de galería. |
| GET | /collections/albums | Arreglo de `{id,ownerId,name,createdAt,count}`. Propios o con fotos accesibles; recuento autorizado. |
| POST | /collections/albums | `{name}` de 1–80 caracteres; hasta 200 propios. Mismo nombre propio devuelve el existente. |
| PATCH | /collections/albums/:id | `{name}`, solo creador; nombre ya usado en otro propio devuelve 409. |
| DELETE | /collections/albums/:id | Solo creador; conserva fotos y limpia su asociación. |
| POST | /collections/favorites/:id | `{favorite:boolean}` sobre una foto accesible; por cuenta e idempotente. |
| GET | /collections/memory | `{day,photo}`; fecha de Costa Rica y DTO autorizado o null. Mismo ID diario para ambos. |
| GET | /wishes | `kind=experience|purchase` obligatorio, `completed=false|true`, `page=1`. 20 por página. |
| GET | /wishes/:id | Ambos participantes. |
| POST | /wishes | `kind`, `title`; opcionales `notes`, `url`, `priceCents`, `currency`. Destinatario calculado. |
| PATCH | /wishes/:id | `title,notes,url,priceCents,currency,completed,revision` requeridos. Ambos participantes; revisión antigua devuelve 409. |
| DELETE | /wishes/:id | Solo creador; elimina avisos y revoca imagen. |
| POST | /wishes/:id/photo | Multipart `file`, sin otros campos. Ambos participantes, devuelve elemento con nueva revisión. |
| DELETE | /wishes/:id/photo | Ambos participantes, revoca la imagen y devuelve elemento actualizado. |

Galería admite también `section=all|favorites`, `albumId` (UUID) y `tag` (una etiqueta completa, máximo 40). Ambos filtros se aplican solo a fotos autorizadas. Los DTO accesibles incluyen `favorite` propio y `albumId`; los bloqueados no los revelan.

Wish: UUID, ownerId/targetId, kind, title (1–120), notes (máximo 3000; defecto vacío), url (máximo 2000; HTTP/HTTPS sin credenciales o vacío), priceCents (null o entero entre 0 y 10 000 000 000), currency (CRC por defecto o USD), completed, revision, assetId y timestamps Unix. No se admiten ownerId/targetId/assetId desde el cliente. POST inicia pendiente/revisión 1. Precio en centésimas de la moneda seleccionada; sin conversión automática. Se generan avisos `kind=wish` al crear o cambiar estado, sin trabajos de correo.

Los avatares y las imágenes de ideas comparten límites y puerta de subida de la galería. Solo conservan WebP sin EXIF; no tienen ruta de descarga del original. Una URL revocada devuelve 404 aunque el trabajador todavía no haya borrado los bytes.
