# Validación 0.8.0 · Mi rincón de mangas

## Ejecutado en el entorno de trabajo

- `npm run build`: backend TypeScript y frontend Vite compilados correctamente.
- `npm test`: **124 pruebas aprobadas, cero fallos, cero omitidas**. Incluye las 107 anteriores y 17 nuevas de mangas.
- `npm audit --omit=dev`: cero vulnerabilidades notificadas en ese análisis; no es una garantía permanente ni una auditoría manual completa.
- Comparación de fuente con el ZIP 0.7.0: no falta ningún archivo anterior. Autenticación, validación de contraseñas, CSS general, módulos originales, reproductor, Ver juntos y faststart no cambiaron. El test de migración de vídeos fija las primeras cinco migraciones para mantener su escenario histórico al agregar una nueva.

Las pruebas de backend usan SQL.js aislado, no MariaDB de producción. Se ejercitó la migración desde las seis migraciones anteriores conservando usuarios, repetición segura y rechazo de una reversión destructiva.

## Casos automatizados nuevos

- Bandera apagada, sesión obligatoria, cuenta autorizada, permisos del creador y lectura compartida.
- Creación/edición/eliminación con confirmación; revisiones y conflictos; validación de enlaces.
- Imágenes múltiples y reordenación; progreso asociado a la página; estados y progreso independientes.
- Volúmenes eliminables conservando capítulos; sustitución de archivos y rechazo de progreso obsoleto.
- PDF con validación de páginas; GET/HEAD y rangos 206/416; entrega privada por Nginx mediante cabeceras.
- Archivos inválidos, ZIP rechazado, límites, subida interrumpida e idempotencia al reintentar.
- Portadas WebP y permisos de archivo; archivos de otra obra, duplicados o tipos mezclados rechazados.
- Notas privadas, conflictos de revisión, reintentos idénticos, cuaderno libre y eliminación confirmada.
- Limpieza de huérfanos sin eliminar archivos referenciados y migración aditiva.

## Navegador ejecutado

Chromium automatizado, dos procesos independientes y dos cuentas de prueba con contraseñas de cuatro caracteres. Base y archivos temporales, sin datos reales:

- Capítulo de 30 imágenes: carga de páginas próximas al visor, navegación, progreso y continuación.
- Lector por páginas, dirección derecha a izquierda y ampliación al 150 %.
- Progreso separado entre los dos usuarios y ausencia de edición de archivos para quien no es propietario.
- PDF integrado dibujado en canvas; cambio a página 3 y persistencia.
- Notas privadas con autoguardado; desconexión simulada, edición y recuperación al reconectar.
- Selección conjunta de 30 imágenes, subida secuencial, reordenación manual y publicación como capítulo.
- Subida de un PDF desde el formulario y cuaderno libre.
- Vista móvil de 390 píxeles y comprobación de ausencia de desbordamiento horizontal del catálogo a 320, 390, 768 y 1440 píxeles. Inspección visual del PDF móvil. Sin errores JavaScript detectados.

Se volvió a ejecutar la prueba de **Ver juntos** sobre 0.8.0: entrada tardía, play/pausa y saltos en ambas direcciones, buffering sintético sin eventos falsos, bloqueo de autoplay simulado y recuperación por gesto, desconexión/reconexión, controles simultáneos, latencia de 750 ms y red limitada, retorno de visibilidad simulado, latidos sin bucles y salida al modo individual mientras el otro continúa. Resultado aprobado.

## Reproducir pruebas

Después de `npm ci`, con las utilidades de medios descritas en las guías:

```sh
npm run build
npm test
```

Los recorridos opcionales `scripts/test-mangas.cjs` y `scripts/test-watch-together.cjs` requieren Playwright disponible en el entorno de pruebas y un Chromium compatible. No se incorpora Playwright como dependencia de producción. Indica la ruta con `CHROMIUM_PATH`; los scripts usan los puertos locales 3000 y 5173, que deben estar libres. **No ejecutarlos directamente en el servidor compartido con ReservaCR.** Crean una base temporal SQL.js, arrancan servidores locales y los cierran al finalizar. No prueban Nginx/MariaDB reales.

## Pendiente en tu instalación

No se ha desplegado ni comprobado esta versión en tu Debian, dominio, Nginx, almacenamiento o MariaDB reales. Tampoco se han probado teléfonos físicos, Safari/iOS, suspensión real de un móvil, PDFs arbitrariamente grandes ni una carga de muchas horas.

Antes de usarla con documentos importantes:

1. Respalda y aplica la migración en una copia o ventana de mantenimiento; confirma que las cuentas y datos anteriores permanecen.
2. Comprueba rutas, permisos del usuario del servicio, `pdfinfo`/`prlimit`, Node y publicación del worker y recursos de PDF.js.
3. Activa la sección, crea una obra de prueba con portada, volumen, imágenes y PDF; edita, reordena y elimina solo datos de prueba.
4. Con ambos teléfonos, comprueba lectura vertical/paginada, zoom, continuación, notas independientes y enlaces externos.
5. Corta la conexión mientras escribes una nota y recupera el borrador; cambia de pestaña y bloquea/desbloquea el teléfono durante una lectura.
6. Prueba un PDF representativo grande y una subida en conexión móvil lenta. Verifica límites y respuesta cuando no quede espacio, usando un entorno de prueba.
7. Con entrega Nginx, confirma los rangos y que una URL privada sin sesión o la ruta interna directa no revele archivos.
8. Revisa vídeos individuales, Ver juntos, subida/faststart, galería, recuerdos, mensajes y las demás secciones con los datos reales.
9. Desactiva la bandera y verifica que el resto siga disponible. Reactívala y confirma que biblioteca/progreso/notas se conservaron.

Solo tras esas comprobaciones puede darse por validada la actualización en tus dispositivos y servidor.
