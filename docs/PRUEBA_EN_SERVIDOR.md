# Validación pendiente en tu entorno

Esta lista complementa las pruebas automáticas; no representa verificaciones ya realizadas.

1. Aplicar la migración en una base MariaDB vacía, ejecutar seed dos veces y confirmar que siguen existiendo exactamente dos cuentas con las mismas credenciales.
2. Iniciar el backend y abrir el frontend. Verificar selección de perfil, primer cambio de contraseña y nuevo login.
3. Crear una tarea desde Ronaldo. Abrir Scarlet en una ventana privada y comprobar que no aparece allí. Repetir a la inversa.
4. Crear un contador, sumar/restar, abrir el historial y comprobar que Scarlet solo puede consultar los de Ronaldo. Enviar cambios simultáneos desde dos pestañas del propietario y comprobar que cada cambio aceptado corresponde a una entrada de historial.
5. Crear una tarea con vencimiento cercano. Comprobar que aparece una sola notificación, aun reiniciando el backend. Confirmar que la otra cuenta no recibe el título de esa tarea.
6. Configurar Gmail, solicitar un código, comprobar la recepción y usarlo una sola vez. Verificar que las sesiones anteriores se cierran. No copiar los códigos o contraseñas a registros.
7. Ejecutar `npm run user:reset -- ronaldo`, entrar con la contraseña temporal y comprobar que se exige cambiarla.
8. Revisar escritorio y móvil: sin desbordamientos, botones utilizables, teclado/Escape en diálogos y panel inferior de contadores. Revisar también el perfil con un nombre largo y tareas con texto de varias líneas.
9. En HTTPS, comprobar en las herramientas del navegador que la cookie tiene `Secure`, `HttpOnly`, `SameSite=Strict` y ruta `/api`.
10. Reiniciar el servicio y verificar persistencia de tareas, contadores, historial y notificaciones. Probar un respaldo y su restauración en una base separada.

Las plantillas de despliegue requieren tu dominio/certificado y rutas reales. No apuntan a un servidor configurado por esta entrega.


## Casos añadidos en 0.2.0

- Primero aplicar la actualización según ACTUALIZAR.md conservando .env y datos.
- Cambiar una contraseña a cuatro caracteres y comprobar que se acepta.
- Crear evento mensual un día 31; revisar febrero y marzo. Revisar calendario en móvil y escritorio.
- Comprobar que la agenda de cada cuenta es privada y que editar una serie afecta todas sus fechas.
- Completar una tarea recurrente y confirmar que aparece una sola siguiente pendiente.
- Crear recordatorio para la otra persona y comprobar que solo el destinatario puede completarlo.
- Simular temporalmente un fallo de SMTP y comprobar que la notificación interna existe aunque el correo se reintente. Restablecer la configuración al terminar.
- Reiniciar el backend con trabajos de correo pendientes y comprobar su recuperación. No probar con avisos dirigidos a otra persona sin su conocimiento.


## Casos añadidos en 0.3.0

- Actualizar desde 0.2.0 siguiendo ACTUALIZAR.md, conservar `.env` y comprobar los datos anteriores. No ejecutar seed para una actualización.
- Abrir Nosotros desde escritorio y móvil; en móvil acceder a Recordatorios y Notificaciones mediante Más. Comprobar texto largo, paginación y diálogos con teclado/Escape.
- Compartir un mensaje inmediato y abrirlo desde su aviso interno en el otro perfil. No deben aparecer indicadores Enviado/Leído.
- Programar un mensaje dos minutos adelante. Confirmar que no aparece en la conversación, listados ni notificaciones del destinatario antes de la entrega. El creador debe verlo en Programados.
- Editar una fecha futura y cancelar otro mensaje programado. La cancelación debe impedir que aparezca luego.
- Detener el backend antes del momento de entrega y reiniciarlo después: debe aparecer el pendiente una vez. Considerar hasta 15 segundos de procesamiento por lote y 30 segundos de refresco de la interfaz.
- En una base de prueba, probar cancelación/edición al mismo tiempo que entrega: o se aplica antes de habilitar o se recibe un conflicto; no se debe modificar contenido ya disponible. Esta carrera requiere MariaDB real, no se valida con SQL.js.
- Eliminar de la vista de un perfil y verificar que el otro conserva el texto; después eliminar desde el segundo.
- Crear petición, comprobar que solo el destinatario puede responder y probar Aceptada, Rechazada, Dame un chance y Tal vez. Cambiar la respuesta debe reflejar el estado actual. Dame un chance no ofrece ni programa recordatorio.
- Eliminar una petición como creador y comprobar que desaparecen su respuesta y los avisos relacionados.


## Casos añadidos en 0.4.0

- Configurar `PHOTO_STORAGE_DIR` persistente, permisos de systemd y límites de Nginx según ACTUALIZAR.md. Confirmar migración y datos anteriores.
- Subir una foto real JPEG/PNG/WebP, abrirla desde el otro perfil y descargar el original. Revisar orientación, nitidez y que no haya recorte en el visor.
- Probar tandas pequeñas antes de cargar las aproximadamente 300 fotos: simular un fallo intermedio y confirmar que las ya guardadas no se reenvían por el botón Subir pendientes.
- Subir foto con contraseña y metadatos distintivos. Desde el otro perfil, verificar placeholder abstracto y 403 en las tres variantes antes de desbloquear; comprobar que la respuesta JSON tampoco contiene sus detalles.
- Combinar fecha futura y contraseña: no debe haber campo de contraseña en el visor antes de la fecha. Tras alcanzarla debe seguir bloqueada hasta la contraseña correcta.
- Verificar que el creador sí puede abrir su propia foto programada y que se le explica la restricción para la otra persona.
- Revisar EXIF con y sin zona, archivos sin EXIF y corrección manual. No debe inferirse captura del nombre del archivo.
- Revisar paginación, textos largos, metadatos vacíos, vista móvil, navegación con teclado y fotos verticales/horizontales.
- Comprobar persistencia de archivos y permisos después de reiniciar la API; descargar una foto ya desbloqueada con una nueva sesión.
- Probar borrado y respaldo/restauración de MariaDB + carpeta de fotos en un entorno separado. No probar restauraciones sobre datos únicos.
- Medir CPU, RAM, duración por foto, espacio del disco y respuesta de las otras pantallas al subir imágenes grandes en el servidor real. No aumentar concurrencia sin esas mediciones.
- Para concurrencia de desbloqueo/eliminación y recuperación ante caídas, usar MariaDB real. SQL.js no valida sus bloqueos ni su DDL implícitamente confirmado.

## Casos añadidos en 0.5.0

- Respaldar primero base y carpeta de fotos; aplicar la migración y comprobar cuentas, contraseñas y álbumes antiguos. No ejecutar seed sobre la instalación existente.
- Marcar una foto como favorita desde un perfil y comprobar que la selección del otro permanece independiente. Reiniciar y confirmar persistencia.
- Crear una foto bloqueada con álbum y etiqueta únicos. El destinatario no debe encontrar esos metadatos en álbumes, recuentos ni filtros hasta poder abrirla.
- Crear, renombrar y quitar un álbum propio: las fotos sobreviven. El otro perfil no puede gestionarlo. Filtrar por álbum y etiqueta, y recorrer más de 24 fotos.
- Revisar el mismo recuerdo en ambos inicios; debe seguir igual al reiniciar. Solo debe usar fotos disponibles para ambos. Al eliminar la elegida, no aparece otra ese día. Comprobar el cambio al siguiente día de Costa Rica.
- Cargar, reemplazar y quitar avatar. La pantalla pública no debe descargarlo. Una URL anterior debe dejar de responder con imagen tras reemplazar/quitar.
- Crear experiencia en Wishlist y compra en Algún día, con y sin campos opcionales. Revisar imágenes verticales/horizontales, precios CRC/USD y enlaces.
- Editar/completar desde el otro perfil y abrir el aviso interno. Probar edición simultánea del texto en dos pestañas: la segunda debe pedir recargar en lugar de sobrescribir silenciosamente.
- Reemplazar/quitar imagen y eliminar una idea como creador; verificar revocación inmediata y limpieza física posterior. El otro puede editar/completar pero no eliminar la idea.
- Probar navegación y diálogos en móvil/PC, texto largo y teclado. Mantener los márgenes laterales acordados.
- Restaurar una copia completa de base + archivos, incluyendo `assets`, en un entorno separado; comprobar galería, permisos, favoritos, recuerdo, avatar y listas.
