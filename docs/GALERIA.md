# Galería privada · 0.5.0

## Uso

**Fotos** muestra fotos sin contraseña cuya fecha de apertura ya llegó. **Con contraseña** conserva las protegidas, incluidas las que tu cuenta ya desbloqueó. **Próximamente** reúne las que tienen una fecha futura, con o sin contraseña. **Todas** reúne la colección y **Mis favoritas** muestra tu selección personal. Cada vista tiene páginas por cursor de 24 fotos, ordenadas por cuándo se agregaron; no se carga toda la colección en el navegador.

Puedes seleccionar hasta 30 archivos por tanda. Se suben individualmente y en orden. Si uno falla, el formulario mantiene solo los pendientes para reintentar y muestra cuántos ya quedaron guardados. Una pérdida de respuesta de red después de guardar puede obligarte a comprobar la galería antes de reintentar ese archivo; no hay deduplicación por contenido en esta entrega.

Se aceptan JPEG, PNG y WebP estáticos, hasta 20 MiB y 40 millones de píxeles por foto. HEIC/HEIF, RAW, TIFF, GIF, SVG y videos no están admitidos. Convierte los archivos no admitidos antes de subirlos. El tipo se comprueba leyendo la imagen, sin confiar únicamente en la extensión o el MIME del navegador.

Los campos descripción, lugar, etiquetas y álbum son opcionales. El botón **Álbumes** permite crear, renombrar y eliminar tus álbumes; al eliminar uno, sus fotos se conservan sin álbum. Puedes filtrar por álbum y por una etiqueta completa. Los álbumes son por creador: dos personas pueden usar el mismo nombre en álbumes distintos. Puedes corregir estos detalles y la fecha de captura después de subir, si eres quien creó la foto. Se ocultan los campos vacíos.

## Acceso

- Cada foto pertenece a quien la sube y se comparte con el otro perfil. Ambos deben iniciar sesión. El creador puede consultar el original y los detalles desde la subida, incluso si la ha reservado para más adelante.
- Para el destinatario, la fecha se comprueba antes que la contraseña. Antes de la apertura no se verifica ninguna contraseña ni se crea un permiso de desbloqueo.
- Si lleva contraseña, el backend guarda un hash scrypt, no el texto. Se aceptan de 4 a 128 caracteres; elige una distinta de la de tu cuenta.
- Cinco fallos bloquean nuevos intentos durante 15 minutos para esa cuenta/foto. Los intentos y permisos se conservan al reiniciar.
- El desbloqueo pertenece a la cuenta y permanece en ella. Después se muestra **Foto desbloqueada**. No se envía una notificación de lectura o desbloqueo al creador.
- Fecha de apertura y contraseña se fijan al subir. Esta entrega no permite cambiar esas restricciones después: evita prometer que se puede volver secreto algo que otra persona ya descargó. Si necesitas reemplazar una foto, puedes eliminarla y subir otra.
- Mientras está bloqueada, la API solo devuelve el identificador, creador, fecha de incorporación/apertura y condición de acceso. No devuelve descripción, lugar, etiquetas, álbum, fecha EXIF, dimensiones ni rutas internas. El placeholder se dibuja con colores abstractos; nunca se deriva de los píxeles reales.
- Los tres archivos —original, miniatura y mediana— comprueban sesión, pertenencia y acceso antes de abrirse. Las respuestas usan `Cache-Control: private, no-store`. Nginx no debe servir la carpeta de archivos directamente.
- Descargar una foto autorizada guarda una copia local; ninguna eliminación posterior puede retirar esa copia. El servidor protege el acceso de las cuentas, no ofrece cifrado de los archivos frente al administrador del servidor.

## Procesamiento y fechas

Se conserva el original exacto para descarga autenticada. Se genera una versión WebP de hasta 1800 × 1800 y una miniatura de hasta 480 × 480, sin ampliar fotos pequeñas. Ambas mantienen la proporción y corrigen la orientación. Sus metadatos EXIF se eliminan; el original conserva los metadatos que traía, incluido GPS si estaba presente.

Se lee `DateTimeOriginal` una vez durante la subida y se persiste su procedencia. Si EXIF incluye `OffsetTimeOriginal`, se conserva también. Una hora de cámara sin zona no se transforma en un instante UTC inventado. La interfaz señala **Indicada por la cámara · no verificada**; no presenta ese dato como una fecha comprobada. La fecha del archivo/nombre y `lastModified` no se utilizan como sustituto.

La fecha se puede corregir manualmente o dejar sin dato; se identifica como manual al cambiarla y se conserva internamente el EXIF original. La fecha de captura es distinta de la apertura programada: la apertura sí se introduce en hora de Costa Rica y se guarda como instante Unix.

## Persistencia y mantenimiento

La publicación ocurre después de escribir el original y las dos variantes en una carpeta temporal y moverlos a su ubicación final. Si guardar el registro falla, se limpian los archivos. Si el proceso se interrumpe bruscamente, el mantenimiento elimina carpetas huérfanas de más de 24 horas; las recientes se conservan para no interferir con una subida activa.

La eliminación primero inhabilita el registro y quita sus notificaciones; después borra los archivos y el registro final. Si falla el borrado físico, se reintenta por lotes de hasta 20 cada 30 segundos. Las fotos inhabilitadas no se sirven mientras esperan limpieza. No hay papelera.

Una foto normal/protegida genera un aviso interno genérico al incorporarse; una futura lo genera al llegar la apertura. Se procesan hasta 50 avisos cada 30 segundos y al iniciar, sin poner descripciones privadas en el aviso. No se envían correos por fotos.

## Recursos

El backend acepta/procesa una sola subida a la vez por proceso; otra recibe HTTP 429 con indicación de reintento. Sharp usa concurrencia 1 y caché de 32 MiB. Esto no equivale a un límite total de RAM del proceso: la decodificación de imágenes también consume memoria. Se comprueba espacio libre antes de escribir, con margen de 100 MiB más tres veces el tamaño del original; no sustituye la monitorización del disco.

El límite inicial es 10 000 fotos activas. Mantén una sola instancia de API con esta configuración: el control de subidas está en memoria del proceso. Antes de aumentar concurrencia o usar varias instancias, mide RAM, CPU, latencia y espacio en el servidor real y añade coordinación compartida. No se afirma haber medido el equipo del usuario.

Referencias de implementación: [constructor y límites de Sharp](https://sharp.pixelplumbing.com/api-constructor/), [salida de Sharp](https://sharp.pixelplumbing.com/api-output/), [lector EXIF exifr](https://github.com/MikeKovarik/exifr).

## Favoritos, álbumes y recuerdo diario

Los favoritos son personales y persistentes. La otra persona no ve tu selección. Solo puedes marcar una foto a la que ya tienes acceso; como creador puedes marcar tus propias fotos futuras. El límite es el de la galería.

Puedes crear hasta 200 álbumes por cuenta. Solo el creador renombra o elimina un álbum. Los álbumes ajenos se muestran únicamente si contienen alguna foto autorizada, y sus recuentos incluyen únicamente las fotos que puedes abrir. Filtrar por álbum o etiqueta tampoco confirma metadatos de una foto bloqueada. Se conserva la paginación por cursor.

El recuerdo de inicio se elige al consultar por primera vez con fotos elegibles cada día, según America/Costa_Rica. Se guarda en la base y es el mismo para ambos, aun después de reiniciar. Una foto futura o con contraseña todavía sin desbloquear por el destinatario queda excluida, aunque el creador pueda verla. Si no hay ninguna elegible, no se fija un recuerdo vacío: se puede elegir después de incorporar o desbloquear una foto. Si se elimina el recuerdo ya elegido, desaparece para ambos y no se sortea otro hasta el siguiente día.

Los avatares y las imágenes de Wishlist/Algún día se suben por separado y no aceptan IDs de fotos de la galería. Consulta PLANES.md para sus permisos y conservación.
