# Decisiones vigentes · versión 0.5.0

Las indicaciones del usuario prevalecen sobre las propuestas previas del asistente. Se mantienen los márgenes laterales de la interfaz. Las contraseñas tienen mínimo 4 caracteres por indicación expresa del usuario. Los controles de intentos se conservan.

## Cambios finales incorporados

- No se implementa la propuesta del punto 15: al responder «Dame un chance» no se ofrece programar un recordatorio. Esa respuesta sigue existiendo entre las opciones de petición.
- No hay encabezados visibles «Marcadores» o «Contadores» sobre el panel lateral. Los nombres accesibles para lectores de pantalla pueden identificar el panel.
- Sí existen notificaciones internas.
- No se agregan indicadores «Enviado» ni «Leído» a mensajes.
- No hay cumpleaños ni módulo de fechas importantes.

## Versión 0.5.0 implementada

Autenticación, recuperación y administración de las dos cuentas; perfil (nombre/color/avatar); inicio; tareas privadas recurrentes; contadores compartidos con propietario; agenda personal con recurrencias; recordatorios propios y para el otro; correos opcionales con cola persistente; notificaciones internas de agenda, recordatorios, tareas y creación de contadores. Se añaden mensajes inmediatos/programados, eliminación independiente por participante, peticiones y avisos internos con acceso al contenido. Galería con variantes privadas, carga por tandas secuenciales, visor, metadatos EXIF/manuales y fotos protegidas/programadas. En 0.5.0 se completan favoritos personales, recuerdo diario compartido, gestión y filtros de álbumes/etiquetas, avatar, Wishlist y Algún día.

La primera versión no genera datos ficticios ni listas de ejemplo en las cuentas reales. Los valores iniciales de las tareas/contadores son vacíos hasta que los usuarios los creen.

## Reglas implementadas

| Módulo | Comportamiento acordado |
|---|---|
| Agenda | Implementada: personal, eventos, repeticiones y avisos. No insertar cumpleaños automáticamente. |
| Tareas | Implementadas: privadas y recurrentes; al completar se crea una sola siguiente tarea futura. |
| Recordatorios al otro | Implementados: notificación interna y opción de correo. |
| Mensajes | Implementados: texto sin categorías, inmediatos/programados, edición/cancelación antes de entregar y eliminación independiente después. Sin indicadores enviado/leído. «Eliminar de mi vista» conserva la copia del otro; cuando ambos eliminan se purga el registro. Decisión aplicada en 0.3.0 y comunicada durante el desarrollo; puede revisarse por indicación del usuario. |
| Peticiones | Implementadas: pendiente, aceptada, rechazada, dame un chance y tal vez. Solo el destinatario responde; puede cambiar su respuesta. El creador elimina para ambos con confirmación. Sin recordatorio sugerido al responder «Dame un chance». |
| Galería | Implementada en 0.4.0. Secciones: con contraseña, próximamente y fotos normales. Placeholder abstracto, nunca miniatura difuminada de la imagen real. Texto «Foto desbloqueada». |
| Seguridad de fotos | Implementada. El creador conserva acceso desde la subida. Para el destinatario, original, miniatura y versión mediana protegidos por autorización del backend. Si se combinan fecha futura y contraseña, comprobar primero la fecha. Nunca enviar bytes antes de autorizar. |
| Fechas de fotos | Implementado: extraer EXIF una vez y persistir. Registrar también origen/confiabilidad de la fecha. Nombre de archivo o `lastModified` no equivalen a una fecha de captura verificada; permitir corregir. |
| Rendimiento | Aproximadamente 300 fotos actuales y crecimiento posible a 10.000. Variantes, paginación por cursor y procesamiento de una imagen a la vez inicialmente. Medir CPU/RAM/disco antes de aumentar concurrencia. |
| Visor | Implementado. Descripción, ubicación, etiquetas y álbumes opcionales; ocultar campos vacíos. |
| Favoritos y álbumes | Favoritos por cuenta; cada creador gestiona sus álbumes. Los nombres y recuentos ajenos solo incluyen fotos accesibles. Quitar un álbum conserva las fotos. |
| Recuerdo aleatorio | Implementado: selección diaria de fotos que ambos tengan derecho a ver. Excluir fotos aún bloqueadas; no revelar su contenido por un módulo secundario. |
| Wishlist | Implementada: experiencias compartidas; ambos editan y completan, solo creador elimina. |
| Algún día | Implementada: lista aparte para compras deseadas, con foto/precio/URL/nota opcionales. |
| Perfil | Avatar privado visible para ambos después de iniciar sesión; sin fecha de nacimiento. |

## Comprobación del entorno final

No quedan módulos pendientes del alcance acordado. La compilación y las pruebas automáticas verifican el código; queda la comprobación de MariaDB, Gmail, móviles/PC reales y recursos del servidor. El usuario confirmó que 0.3.0 funciona; eso no equivale a validar los nuevos módulos en su entorno. Las listas y avatares usan archivos propios, sin poder asociar fotos bloqueadas de la galería por su identificador.

El servidor previsto tiene 4 GB de RAM, 2 núcleos y 1 TB HDD. Esta descripción no garantiza capacidad o rendimiento: faltan mediciones del equipo y de los archivos reales. No se sustituyó MariaDB/NestJS por almacenamiento del navegador ni por otro servicio de hosting.
