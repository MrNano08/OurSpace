# Navegación y lectura · 0.8.1

## Cambios

- La dirección usa fragmentos como `#/agenda`, `#/videos?folder=…&video=…` y `#/mangas?book=…&chapter=…`. Las secciones, carpetas, favoritos de vídeo, obras, capítulos y cuaderno libre ahora participan en el historial. Recargar recupera esa vista después de validar la sesión, sin volver automáticamente a Inicio.
- Atrás y Adelante del navegador recorren las vistas visitadas. No se bloquea la salida de la aplicación al agotar su historial: en Inicio, Atrás puede regresar al sitio anterior. No se promete restaurar formularios sin guardar, archivos seleccionados, diálogos o todos los filtros internos de agenda/fotos/tareas.
- El lector de mangas tiene un botón **Pantalla completa**. Intenta la API nativa y, si no está disponible o se rechaza, ocupa la ventana con el mismo lector. Se impide el desplazamiento de fondo. Salir de pantalla completa o Escape restaura la vista, conservando la página; el tamaño de la interfaz puede cambiar con el teclado o la orientación del dispositivo.
- Botones visibles de regreso al inicio, a la biblioteca, a las obras, a la carpeta y al catálogo de vídeos; altura mínima de 44 px para los controles de regreso. Las rutas profundas continúan teniendo un regreso disponible aunque se abran directamente.
- El menú superior muestra los accesos principales y **Más** con todas las otras secciones. No usa desplazamiento horizontal; conserva el indicador de notificaciones. En móvil se mantiene la navegación inferior.
- En la ficha de manga, enlaces externos en su propio bloque y con separación del botón de continuar; selector **Mi estado** separado 24 px de la administración. Se conservan los márgenes generales.
- Los selectores de archivos usan borde, fondo y botón acordes al diseño, manteniendo la selección nativa accesible y los mecanismos de subida existentes.

## Actualizar desde 0.8.0

Conserva el `.env` y todas las carpetas persistentes. Sustituye el código de la entrega y ejecuta `npm ci` y `npm run build`. Publica todo `frontend/dist` en la ubicación que ya usa tu Nginx y reinicia el servicio de Nuestro Espacio si tu procedimiento de actualización lo requiere. No ejecutes seed. Esta actualización no agrega migraciones, dependencias, variables ni cambios de Nginx. No afecta ReservaCR.

Los fragmentos `#` los maneja el navegador; no requieren reescrituras nuevas del servidor. Recarga la página después de publicar. Volver al frontend anterior revierte estos cambios sin modificar los datos ni archivos.

## Validación

- Compilación TypeScript/Vite correcta y **124 pruebas de backend aprobadas**, sin fallos ni omitidas.
- Chromium con dos cuentas: secciones y capítulo conservados al recargar; Atrás/Adelante entre vistas; vídeo recuperado al recargar; navegación entre carpeta y reproductor.
- Pantalla completa alternativa con rechazo nativo simulado: ocupa la ventana, bloquea el scroll de fondo, sale correctamente y conserva la página 17.
- Lectura PDF, progreso independiente, 30 imágenes, reordenación, subida PDF, notas privadas, recuperación tras desconexión y cuaderno libre comprobados de nuevo.
- Separación de estado/administración y enlace/continuación comprobada por geometría; navegación sin scroll horizontal en anchos 581, 768, 1024, 1280, 1440 y 1920; catálogo sin desbordamiento a 320, 390, 768 y 1440.
- Inspección visual de capturas de navegador. No se ha desplegado en tu Debian ni probado el botón físico en Android/iOS: Atrás se ejercitó con el historial del navegador automatizado. La pantalla completa nativa y la suspensión del teléfono necesitan comprobación en tus dispositivos.

El recorrido ampliado está en `scripts/test-navigation.cjs`; requiere Playwright y Chromium en el entorno de QA, utilidades de medios y puertos 3000/5173 libres. Usa la misma base temporal que las pruebas anteriores. No lo ejecutes en el servidor compartido donde esos puertos puedan pertenecer a otra aplicación.
