# Resultado de validación · versión 0.5.0

Verificaciones ejecutadas en el entorno de desarrollo:

- Compilación TypeScript de NestJS: correcta.
- Compilación TypeScript y bundle Vite de React: correctos.
- Pruebas de integración: 66 aprobadas, 0 fallidas.
- Motor de pruebas: SQL.js en memoria, con las cinco migraciones aplicadas y sin sincronización automática.
- Auditoría `npm audit --omit=dev` ejecutada para 0.4.0: 0 vulnerabilidades reportadas. No sustituye una revisión de seguridad completa.
- Dependencias fijadas por package-lock.json. Sin nuevas dependencias respecto de 0.4.0. La auditoría indicada arriba corresponde a esa versión, no a una consulta nueva en 0.5.0.
- Prueba de migración desde el esquema 0.1.0 con usuario y tarea existentes: conserva los datos y permite reanudar la nueva migración.
- Casos añadidos: contraseñas de cuatro caracteres, agenda privada, recurrencias en fin de mes/años bisiestos, tareas sin duplicación al completar dos veces, recordatorios propios/compartidos y reintentos de correo.
- Corregido un defecto en PATCH: los campos omitidos ya no reciben los valores por defecto de creación.

Casos añadidos en 0.3.0:

- Mensajes inmediatos visibles para ambos sin recibos de lectura ni marcas de borrado del otro.
- Mensajes futuros inaccesibles al destinatario por listado, consulta directa, edición, cancelación y eliminación.
- Recuperación por una nueva instancia del worker sobre datos pendientes, sin duplicar avisos. No equivale a una prueba de caída/reinicio real de MariaDB.
- Reprogramación y cancelación, y conflicto al intentar modificar un mensaje ya habilitado.
- Eliminación independiente y purga cuando ambos lo ocultan.
- Sesión/origen obligatorio, validación estricta y protección contra asignación de propietarios/destinatarios.
- Respuestas de peticiones reservadas al destinatario, cuatro opciones, nota opcional, cambio de respuesta e idempotencia de la misma respuesta.
- Ausencia de recordatorios y correos generados por respuestas.
- Eliminación de peticiones por el creador con limpieza de notificaciones.
- Paginación y conservación de usuarios/tareas de 0.2.0 al aplicar y reanudar la migración nueva.

Casos añadidos en 0.4.0 (13 pruebas):

- Subida real de archivos sintéticos, preservación exacta del original y variantes WebP decodificables, sin EXIF.
- Acceso autenticado de archivos; contraseña bloquea original, mediana, miniatura y metadatos.
- Fecha antes de contraseña sin intentar validar ni conceder permisos antes de tiempo.
- Apertura por fecha sin contraseña y aviso de apertura único.
- Bloqueo persistente tras cinco fallos y recuperación al vencer.
- Fecha EXIF con offset, orientación corregida, fecha no inventada por nombre y edición manual con conservación del EXIF original.
- Rechazo de SVG, contenido inválido, archivos de más de 20 MiB, campos extra, fechas inválidas, sesión ausente y origen ajeno.
- Permisos de edición/eliminación y limpieza de archivos, notificaciones y permisos.
- Rollback de archivos si falla publicar en DB y puerta de procesamiento de una subida a la vez.
- Cursores estables frente a nuevas incorporaciones.
- Limpieza de huérfanos antiguos que conserva registros activos y carpetas recientes.
- Reejecución de migración sin duplicar índices/relaciones ni modificar usuarios existentes.

Casos añadidos en 0.5.0 (12 pruebas):

- Favoritos por cuenta, idempotencia y rechazo antes de desbloquear.
- Álbumes y recuentos sin metadatos bloqueados; filtros con comodines tratados como texto.
- Gestión exclusiva por creador; quitar un álbum conserva las fotos.
- Recuerdo diario igual para ambos y estable; exclusión de fecha/contraseña y eliminación sin sortear de nuevo.
- Avatar autenticado, ausente en perfiles públicos, reemplazo con revocación y limpieza de archivos; solo WebP sin EXIF retenido.
- Listas separadas; edición compartida, conflictos de revisión y eliminación exclusiva por creador.
- Rechazo de enlaces ejecutables, precios inválidos e IDs de fotos privadas.
- Imágenes privadas de ideas, reemplazo/eliminación y limpieza.
- Puerta de subida compartida entre avatar y galería.
- Migración reanudable y actualización desde un esquema 0.4.0 con usuarios y foto existentes; conserva credenciales, metadatos y convierte álbumes.

Los archivos de prueba se generan y eliminan en directorios temporales; no se usaron fotos personales. El lector EXIF y el procesador Sharp sí se ejecutaron de verdad.

No ejecutado en este entorno: MariaDB real, concurrencia bajo bloqueos de MariaDB, envío SMTP real, navegación y revisión visual en navegador, despliegue en el servidor del usuario. Las pruebas usan un transporte de correo simulado y direcciones example.test; no se enviaron mensajes a las cuentas personales.

Consulta PRUEBA_EN_SERVIDOR.md antes de dar por validado el entorno final.
