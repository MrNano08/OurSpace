# ❤️ Ver juntos · Nuestro Espacio 0.7.0

## Auditoría y decisión

Se revisó la fuente real 0.6.0 disponible, comparándola con el ZIP anterior. No se accedió al Debian, base o configuración del servidor del usuario. Si allí existen cambios posteriores a ese ZIP, deben conservarse al integrar esta entrega. No contiene cambios de ReservaCR.

| Área auditada | Situación e impacto |
|---|---|
| Frontend | React 19/Vite; reproductor HTML5, progreso individual y catálogo existentes. Controlador nuevo aislado que no cambia `src`, subida por bloques ni almacenamiento de progreso. |
| Backend | NestJS 11/Express. HTTP y cookies existentes; no había WebSockets. Se usan SSE para recibir eventos y POST para controles/latidos, sin dependencias nuevas. |
| Autenticación | AuthGuard comprueba cookie y origen de escrituras; las rutas nuevas también restringen a los slugs `ronaldo`/`scarlet`. Se conserva el mínimo de cuatro caracteres y el cambio obligatorio de contraseña temporal. |
| Base de datos | TypeORM/MariaDB. Ninguna tabla, migración o escritura nueva para sesiones/presencia. Los guardados individuales ya existentes continúan. |
| Vídeos | Archivos privados en disco. Nginx/X-Accel-Redirect en producción, Range de Node en desarrollo. Sin nuevo relay, transcodificación o cambio de URL. |
| Subidas | Bloques de 8 MiB y validación final existentes. Faststart se inserta únicamente al finalizar. Una finalización por proceso, como antes. |
| Despliegue | Se mantiene la restricción previa de una instancia de backend. Memoria local no es apropiada para clúster/balanceo entre procesos. No se instala Redis, broker, servicio de pago ni daemon adicional. |

Riesgos tratados: bucles por eventos remotos, carreras entre controles, pestañas duplicadas, autoplay bloqueado, presencia obsoleta, reconexión, reproducción en segundo plano y falta de disco. El controlador se desconecta sin cambiar el archivo del reproductor; un error no desactiva los controles individuales. Los estilos son locales a la sección y no cambian márgenes o CSS general.

No se modificaron los módulos de recuerdos/fotos/mensajes/planes, autenticación, esquema SQL ni plantillas críticas de Nginx/systemd. La plantilla 0.6.0 ya contiene `proxy_buffering off` y timeout de 1800 s en `/api/videos/`. Hay que comprobar que el servidor real tenga esos ajustes, sin reemplazar su configuración completa.

## Activar y usar

En el `.env` real del backend:

```dotenv
WATCH_TOGETHER_ENABLED=true
VIDEO_FASTSTART=true
```

Reinicia únicamente el servicio real de Nuestro Espacio y recarga la web. No confundir su servicio/puerto con otra aplicación. Si la variable se omite, **Ver juntos está desactivado** y **faststart automático está activado**.

1. Ambos inician sesión con sus cuentas existentes.
2. Abren el mismo vídeo y pulsan **❤️ Ver juntos**. La primera persona crea la sesión con su posición/pausa actual; la segunda adopta ese estado.
3. Cualquiera puede reproducir, pausar, adelantar y retroceder. No hay anfitrión.
4. Solo: **Esperando a tu persona especial ❤️**. Ambos presentes, listos y sin desfase importante: **❤️ Viendo juntos — Sincronizados**. Durante carga o ajuste se muestra un estado intermedio.
5. Si el navegador impide reproducir, pulsa **Toca para sincronizar la reproducción**.
6. **Salir de Ver juntos** vuelve al modo individual sin pausar ni cambiar al otro. La velocidad individual previa se restaura.

Una sesión compartida y un dispositivo/pestaña por cuenta. Si la otra persona está en un vídeo diferente, se avisa y no se cambia su vídeo. Abre el mismo vídeo para unirte. Cambiar de vídeo o salir de la página cierra la participación propia. Durante Ver juntos se suspende el avance automático al siguiente; la preferencia individual se conserva. No se comparte volumen, pantalla completa ni velocidad: en conjunto se usa velocidad normal con pequeños ajustes temporales.

## Protocolo y tolerancia a fallos

- Sala temporal en memoria: UUID de sesión, vídeo, posición anclada, pausa, versión, reloj del servidor y dos miembros como máximo mediante los perfiles autorizados.
- Comandos con secuencia por cliente y versión esperada. Duplicados/desordenados no se aplican de nuevo. En conflicto simultáneo gana el primero recibido; el otro adopta el estado confirmado y puede volver a actuar. No se reenvían controles antiguos después de una caída.
- Acciones locales agrupadas durante 180 ms y un envío en vuelo por cliente. El servidor limita ráfagas por miembro. Los cambios remotos de play/pause/seek se reconocen para evitar eco.
- SSE emite cambios y una instantánea cada 15 s. El cliente revisa desfase local cada 5 s, sin solicitudes de lectura del vídeo o del catálogo para sincronizar.
- Estimación del desfase de reloj mediante respuestas HTTP y compensación de tiempo transcurrido. Zona tolerada de 0,3 s; ajustes de velocidad 0,96–1,04 para desfases menores; salto directo por encima de 1,5 s o ante un control nuevo. No pretende precisión al milisegundo.
- Latido autenticado aproximadamente cada 25–30 s y en cambios de disponibilidad. Reutiliza AuthGuard: una sesión revocada no puede prolongar su presencia. La concesión de presencia dura 70 s; una pérdida silenciosa puede tardar hasta unos 85 s en desaparecer del servidor. El cliente detecta silencio SSE a los 35–40 s.
- Reconexión con espera exponencial de aproximadamente 1 a 30 s y variación aleatoria; al volver internet/pestaña se intenta antes. Recupera estado confirmado, sin recargar toda la app.
- `waiting`/`playing`/`canplay` actualizan disponibilidad, no el estado compartido. Pausas automáticas ocultas o durante buffering se ignoran; una interacción explícita con controles permite pausar incluso mientras carga. Quien carga lento se pone al día al recuperar datos: no detiene al otro.
- Pausas/restricciones móviles no se pueden evitar desde una web. Hay recuperación por gesto y al volver a la pestaña. Un teléfono realmente suspendido puede perder presencia y reincorporarse; esto requiere validación en los equipos reales.
- Miembros sin latidos caducan, sala vacía expira tras cinco minutos y una sala pausada/finalizada sin controles caduca tras treinta minutos. Entonces se cierran conexiones y temporizador. No queda un proceso permanente de esta función cuando no hay sala.
- Reiniciar el backend pierde la sala temporal; los reproductores pueden continuar individualmente y reincorporarse creando una sesión nueva. La posición duradera sigue siendo el progreso individual existente, no una tabla nueva.

## Consumo estimado, sin medición del Debian real

| Recurso adicional con dos personas | Orden de magnitud |
|---|---|
| Conexiones | Dos SSE, una por cuenta; POST breves para controles y presencia. |
| Mensajes periódicos | 480 instantáneas SSE/h entre ambos (cada 15 s por persona), más cambios. |
| Latidos | Aproximadamente 240–288 POST/h entre ambos, más cambios de buffering/disponibilidad. |
| Base | Cero escrituras nuevas por sincronización. La validación de cada petición usa las dos lecturas de autenticación existentes: aproximadamente 480–576 lecturas/h por latidos, más dos por control/conexión y una lectura de vídeo por entrada. No se consulta continuamente el estado de sala en MariaDB. |
| Memoria | Una sala, hasta dos miembros y dos conexiones. No hay historial creciente ni lista ilimitada de eventos. |
| Tráfico de coordinación | Instantáneas JSON de unos cientos de bytes: orden de cientos de KiB/h más cabeceras/TLS y controles. Es una estimación, no una medición de factura. |
| Tráfico de vídeo | Cada equipo descarga del almacenamiento actual. Dos espectadores pueden consumir aproximadamente el doble de tráfico que uno; no existe multicast por internet en esta solución. Nest solo coordina y autoriza; Nginx continúa sirviendo los bytes como antes. |
| Costos | Sin servicio, plan o licencia nuevos. Se usa disco, CPU e internet existentes; el proveedor podría cobrar tráfico según el plan actual. |

Los guardados de progreso cada 15 s por reproductor ya existían y no se duplican en una tabla de sincronización. No se envía un evento por cuadro ni por `timeupdate`.

## MP4 faststart automático

Para **nuevas subidas** H.264 con audio AAC (o sin audio), el servidor comprueba la estructura. Si `moov` ya precede a `mdat`, no modifica los bytes. Si hace falta, ejecuta FFmpeg con `-map 0 -c copy -movflags +faststart`: reordena el contenedor sin recodificar los flujos y conserva calidad. No convierte HEVC a H.264 ni garantiza reparar archivos dañados.

Se requiere `ffmpeg` además de `ffprobe`; ambos están en el mismo paquete Debian que ya requería la validación. Esta entrega **no instala paquetes** en tu servidor. Comprueba `ffmpeg -version` y `ffprobe -version` como usuario del servicio antes de subir.

Seguridad de publicación:

1. Se valida tamaño completo, estructura, códecs/duración y hash original.
2. Se comprueba espacio libre para una copia adicional, margen de al menos 16 MiB o 5 %, y la reserva configurada. La comprobación no reserva espacio frente a otros procesos; si el disco se llena después, se conserva el original.
3. Salida temporal `.UUID.prepared` en `media`, creada privada; ningún endpoint la publica. Se conservan los bytes del `.part` original.
4. Se vuelve a comprobar estructura, faststart, códecs y duración. Se sincroniza la copia a disco, se fija 0640 y se publica por renombrado antes del commit del catálogo.
5. Solo tras confirmar la transacción se elimina el original parcial. Un error conserva la subida para reintentar; una caída después del renombrado y antes del commit también es recuperable. Los temporales huérfanos se retiran con el mantenimiento existente y una hora de gracia.

El hash almacenado sirve para deduplicar el **archivo original subido**; el campo `bytes` describe el MP4 publicado. Tras reorganizar el contenedor, el hash no es una comprobación de integridad del archivo publicado. Ningún endpoint anterior expone ese hash.

Una preparación a la vez, límite de FFmpeg de 25 minutos y sin tareas periódicas de conversión. Consume principalmente E/S de disco (lectura del original, copia/reorganización, validación/hash de salida), algo de CPU y aproximadamente otra copia del tamaño del vídeo mientras trabaja. No se puede estimar su duración en el HDD real sin probarlo. Subir un archivo ya preparado evita ese trabajo.

Los vídeos ya publicados **no se reescriben, borran ni migran**. Si necesitas preparar alguno existente, debe hacerse como tarea aparte con respaldo y verificación, sin sobrescribirlo a ciegas.

## Actualización segura desde 0.6.0 y reversión

1. Conserva código/compilación anterior, `.env`, copia de MariaDB y almacenamiento privado. Comprueba si hay cambios propios posteriores al ZIP 0.6.0.
2. Compila en una carpeta de la nueva versión (`npm ci`, `npm run build`, `npm test`) conservando la configuración real. Esta actualización desde 0.6.0 no exige migraciones, `db:seed` ni cambios de credenciales.
3. Comprueba espacio, ejecutables FFmpeg y permisos del usuario del servicio. Mantén las rutas de almacenamiento existentes.
4. Verifica que `/api/videos/` mantenga streaming SSE sin buffering/caché y su timeout existente; no reemplaces dominio, TLS, puertos ni unidad systemd. Si falta, adapta únicamente ese bloque y valida con `nginx -t` antes de recargar.
5. Comprueba lectura de Nginx de un vídeo existente, una subida que ya tenga faststart y otra preparada por el servidor. **Renombrar desde `partial` no hereda el grupo de `media`**: los permisos efectivos de la instalación deben permitir leer el archivo final. Es una condición preexistente de 0.6.0; no se cambian grupos/ACL del servidor automáticamente.
6. Despliega la compilación con `WATCH_TOGETHER_ENABLED=false`; comprueba login de cuatro caracteres, fotos, mensajes, recuerdos, vídeos individuales y una subida pequeña. Activa la bandera y prueba los dos equipos según el informe de validación.

Desactivar rápidamente: configura `WATCH_TOGETHER_ENABLED=false`, reinicia el servicio de Nuestro Espacio y recarga la web. Las rutas dejan de funcionar y el botón desaparece; los vídeos/progresos permanecen.

Desactivar preparación: `VIDEO_FASTSTART=false`. Los archivos ya preparados siguen reproduciéndose. Las nuevas subidas que necesiten faststart quedan pendientes con un mensaje, como en 0.6.0; las que ya estén preparadas siguen funcionando.

Reversión completa: detén el backend, conserva subidas pendientes, vuelve al código/compilación 0.6.0 y a su configuración anterior, y arranca el mismo servicio. No hay migración que deshacer. Los nuevos MP4 publicados son compatibles con el reproductor anterior. No borres datos ni ejecutes migraciones descendentes. Una preparación interrumpida conserva el `.part`; el código antiguo no preparará ese archivo por sí solo. Conserva temporales hasta revisar las subidas.

## Código y pruebas

Nuevos módulos: `backend/src/videos/together/`, `frontend/src/components/videos/together/`. Integración limitada a registro Nest, capacidades del catálogo, configuración y reproductor. Faststart está en `VideoStorage.prepare` y la finalización existente. Pruebas: `backend/test/together.test.ts`, ampliaciones de `videos.test.ts` y runner opcional `scripts/test-watch-together.cjs`.

Consulta [VALIDACION_0.7.0.md](VALIDACION_0.7.0.md) para lo comprobado y lo pendiente. Esta entrega no declara terminada la validación en tu Debian ni en teléfonos reales.
