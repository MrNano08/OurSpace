# Validación de Nuestro espacio 0.6.0

Fecha: 8 de octubre de 2026. Base: ZIP 0.5.0 proporcionado. Se trabajó en una copia aislada; no se conectó con el servidor ni con la base de datos real.

## Verificación automatizada ejecutada

- `npm ci`: instalación correcta desde el lockfile.
- `npm run build`: compilación de backend TypeScript y frontend TypeScript/Vite correcta.
- `npm test`: **88 aprobadas, 0 fallidas, 0 omitidas**. Incluye las 66 pruebas anteriores y 22 nuevas de videos.
- Motor de pruebas: SQL.js, seis migraciones, `synchronize: false`, archivos temporales y correo simulado.
- Se ejecutaron realmente ffprobe, Sharp y lectura/escritura en disco. No se usaron videos ni imágenes personales.

Los casos nuevos comprueban permisos por perfil, sesión/origen, carpetas, revisión obsoleta, orden consecutivo, movimiento sin perder progreso, conservación al borrar carpeta, eliminación explícita y relaciones, imágenes WebP privadas y revocadas al reemplazar, subidas fragmentadas, desfase, interrupción, límites, MP4 inválido, faststart, duplicados, duración superior a dos horas, rangos HTTP exactos/HEAD/416, encabezado X-Accel-Redirect, descarga configurable, progreso/favoritos individuales, migración desde 0.5.0, caducidad de parciales, MP4 de más de 8 MiB, recuperación de bytes no confirmados, recuperación entre renombrado y commit, reserva de disco y límite de subidas pendientes.

El fixture largo es un MP4 sintético real H.264 de 1920×1080 con pocos cuadros muy espaciados y más de dos horas de duración. Valida formato y duración sin almacenar un archivo de varias horas a bitrate normal. No equivale a probar dos horas de reproducción sostenida.

## Navegador

Se utilizó Chromium local con una instancia aislada NestJS/SQL.js y frontend Vite. Se revisaron capturas de catálogo, carpeta y reproductor. El inicio de sesión acepta la contraseña de prueba de cuatro caracteres. El reproductor identificó 1920×1080, duración de tres segundos y reanudación en el segundo 1.

El catálogo se comprobó en anchos de 320, 390, 580, 600, 768, 850, 1024, 1440, 1660 y 1920 píxeles. Se corrigió un desbordamiento de la navegación en tableta mediante desplazamiento interno del menú, manteniendo los márgenes del contenedor. El ancho del documento coincide con la ventana en los diez tamaños.

Se corrigió además el ciclo de montaje/desmontaje simulado de React StrictMode en el componente de subida para mantener visibles el progreso y el resultado final en desarrollo.

También se ejecutó el recorrido de reproducción hasta el final, siguiente video, creación de carpeta y subida completa desde el navegador (inicio, bloque, validación y aparición del video en Sin carpeta). Resultado: correcto, sin errores JavaScript registrados. Esto usa un MP4 pequeño sintético y no sustituye la prueba de un video grande desde Internet.

## Conservación de la base

Comparación byte a byte con el ZIP original: `frontend/src/styles/app.css`, `backend/src/common/validation.ts`, `frontend/src/pages/Login.tsx` y `frontend/src/pages/Profile.tsx` permanecen iguales. Las reglas de contraseñas y los márgenes generales no se alteraron. La nueva migración añade tablas de videos sin cambiar usuarios ni credenciales.

El único ajuste de una prueba anterior fija explícitamente las primeras cuatro migraciones en el escenario histórico de 0.4.0, para evitar que `slice(0,-1)` cambie de significado al añadir una sexta migración.

## Pendiente en el entorno real

- MariaDB: migración sobre copia de los datos y concurrencia bajo bloqueos reales.
- Nginx: validación de su configuración, alias interno, permisos, TLS y Range/206 a través del proxy. Se probó el encabezado que emite el backend, pero no se ejecutó Nginx aquí.
- Sistema operativo: usuario real del servicio, ACL de paso, grupo de lectura, disco montado, reinicio y restauración de un respaldo completo.
- Video grande real de varios GiB, subida/interrupción desde Internet, consumo de CPU/RAM/HDD y reproducción sostenida desde la otra región.
- Android/iOS y navegador final del destinatario; no se presenta una emulación de ancho móvil como prueba de un dispositivo físico.
- No se realizó una auditoría nueva de vulnerabilidades en esta entrega ni se verificó SMTP real.

Las instrucciones están en `VIDEOS.md`. Estas verificaciones pendientes no deben marcarse aprobadas hasta ejecutarlas en Debian.
