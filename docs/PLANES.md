# Perfil, Wishlist y Algún día · 0.5.0

En escritorio abre **Planes**; en móvil, **Más → Wishlist y Algún día**. Wishlist contiene experiencias; Algún día es una lista independiente de compras deseadas. Al crear, solo es obligatorio el título. Nota, imagen, enlace y precio son opcionales. El precio se anota en colones o dólares: es informativo, sin conversión de divisa ni consulta a tiendas.

Ambos pueden editar, marcar como realizado y devolver a pendientes. El filtro de realizados conserva el historial hasta que el creador decida eliminar un elemento. Solo el creador puede eliminarlo por completo, con confirmación; desaparece para ambos. Se admiten hasta 2000 elementos creados por persona entre las dos listas y se muestran 20 por página.

Los cambios de texto/estado usan un número de revisión: si la otra persona cambió el elemento, guardar devuelve un conflicto y el formulario ofrece cargar la versión actual antes de continuar. La imagen se actualiza por separado; dos reemplazos de imagen consecutivos conservan el último aceptado. Si se guardó el texto pero falló la imagen, el formulario conserva el registro para reintentar sin crear otra idea. Ante una pérdida total de respuesta de red al crear, comprueba la lista antes de repetir: no hay claves de idempotencia para creación.

Se crea una notificación interna para el otro al agregar una idea o cambiar pendiente/realizado. Editar detalles o imagen no genera un aviso nuevo. No se envían correos por estas acciones. La notificación abre el elemento autorizado; al eliminarlo se eliminan sus avisos.

Los enlaces admiten HTTP/HTTPS sin credenciales. El servidor no visita ni descarga esas URLs; se abren solo al pulsar el enlace del navegador. No se aceptan IDs de fotos de galería como imagen de una idea.

## Avatar e imágenes privadas

En **Mi perfil** puedes agregar, reemplazar o quitar tu avatar. El nombre y color siguen siendo editables; el correo es fijo y no se agrega fecha de nacimiento. Los avatares solo se muestran a las cuentas con sesión; la pantalla pública de selección de perfil conserva iniciales y colores.

Las imágenes de avatar y de ideas admiten los mismos formatos/límites de entrada de la galería: JPEG/PNG/WebP estáticos, 20 MiB, 40 megapíxeles. Comparten la puerta que admite una sola subida a la vez por proceso. Se guardan versiones WebP orientadas y sin EXIF, sin conservar un original para descarga. No se exige ni permite contraseña/fecha de apertura en estos archivos: ambos perfiles pueden verlos con sesión iniciada.

Se almacenan bajo `PHOTO_STORAGE_DIR/assets`, fuera de la raíz web. `/api/assets/:id` exige sesión, pertenencia y que el archivo continúe vinculado al perfil o idea. Reemplazar/quitar una imagen o eliminar su idea revoca inmediatamente su acceso. La limpieza física se reintenta hasta 20 archivos cada 30 segundos; los huérfanos de más de 24 horas se revisan cada hora. No hay papelera.

Respalda la carpeta completa `PHOTO_STORAGE_DIR`, incluyendo `assets`, junto con MariaDB. Los archivos nunca se deben servir por Nginx directamente.
