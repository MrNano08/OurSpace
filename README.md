# Entrega 0.8.0 · ❤️ Mi rincón de mangas

Integración sobre 0.7.0: biblioteca privada, capítulos con imágenes o PDF, lector móvil, progreso individual, enlaces y notas con recuperación de borradores. Conserva Ver juntos, faststart, diseño general y contraseñas desde cuatro caracteres.

- Activación, límites, dependencias y reversión: [docs/MANGAS.md](docs/MANGAS.md).
- Pruebas ejecutadas y pendientes: [docs/VALIDACION_0.8.0.md](docs/VALIDACION_0.8.0.md).
- Desactivado por defecto con `MANGAS_ENABLED=false`. Requiere una migración aditiva, Node >=22.13 y las utilidades `pdfinfo` y `prlimit` para validar PDF. No ejecutar `db:seed` al actualizar.
- ZIP y CBZ quedan pendientes; esta entrega admite PDF, JPG/JPEG, PNG y WebP.

# Entrega 0.7.0 · ❤️ Ver juntos y faststart automático

Integración sobre 0.6.0, sin nuevas migraciones ni dependencias npm. Ver juntos está desactivado por defecto; faststart se aplica a nuevas subidas compatibles.

- Auditoría, uso, activación, consumo y reversión: [docs/VER_JUNTOS.md](docs/VER_JUNTOS.md).
- Pruebas ejecutadas y pendientes: [docs/VALIDACION_0.7.0.md](docs/VALIDACION_0.7.0.md).

# Entrega 0.6.0 · Biblioteca privada de videos

Esta versión amplía la base 0.5.0. Conserva cuentas, contraseñas desde cuatro caracteres, diseño y márgenes laterales. No contiene datos personales ni archivos multimedia del servidor.

- Videos: carpetas con portada, orden manual, MP4 privado, subidas reanudables, reproducción secuencial, progreso y favoritos por perfil.
- Guía de actualización y decisiones técnicas: [docs/VIDEOS.md](docs/VIDEOS.md).
- Validación real y pendientes: [docs/VALIDACION_0.6.0.md](docs/VALIDACION_0.6.0.md).
- Requiere `ffprobe` (paquete `ffmpeg` de Debian) para validar subidas; `ffmpeg` también para los fixtures de `npm test`.
- No ejecutar `db:seed` al actualizar una instalación existente.

El contenido siguiente conserva la documentación de los módulos anteriores.

---

# Nuestro espacio · versión 0.5.0

Aplicación para Scarlet y Ronaldo. React + Vite + TypeScript, NestJS, TypeORM y MariaDB. Código de la versión 0.5.0. Continúa el proyecto iniciado el 7 de octubre de 2026.

## Actualizar desde 0.4.0 (o versiones anteriores)

Si ya te funciona el proyecto, sigue [docs/ACTUALIZAR.md](docs/ACTUALIZAR.md). Conserva tu `backend/.env`, realiza un respaldo y ejecuta únicamente la migración pendiente. No necesitas crear de nuevo las cuentas ni cambiar tus contraseñas. Si vienes de 0.4.0, conserva el almacenamiento de fotos y la configuración de Nginx. Si vienes de una versión anterior, la guía incluye esos ajustes.

## Qué funciona en esta entrega

- Selección de los dos perfiles, contraseña independiente y sesiones revocables en cookie HttpOnly.
- Creación inicial desde `.env`, cambio obligatorio en el primer ingreso y seed que no modifica cuentas existentes.
- Contraseñas de cuenta de 4 a 128 caracteres, según la preferencia solicitada. Se mantienen hash y bloqueo por intentos; `AUTH_SECRET` requiere un secreto aleatorio largo.
- Recuperación por código enviado al correo fijo de cada persona, con vencimiento a los 10 minutos, máximo cinco intentos y un solo uso.
- Scripts para restablecer contraseñas, desbloquear cuentas y listar usuarios.
- Inicio, tareas privadas (crear, editar, completar y eliminar), prioridades y cuenta regresiva. Repeticiones diarias, semanales, mensuales y anuales. La siguiente tarea se crea al completar la actual.
- Agenda privada mensual, eventos y series recurrentes, ubicación/nota opcionales, aviso interno y opción de correo.
- Recordatorios para ti o para la otra persona, con fecha, nota opcional y opción de correo. Solo el destinatario marca como completado.
- Mensajes de texto inmediatos o programados; los futuros solo los ve su creador. Edición y cancelación antes de la entrega. Eliminación independiente después, sin estados Enviado/Leído ni categorías.
- Peticiones con respuestas Aceptada, Rechazada, Dame un chance y Tal vez; comienzan Pendientes. Nota opcional y cambio de respuesta por el destinatario.
- Notificaciones internas con acceso directo al mensaje o petición correspondiente.
- Cola de correo persistente, reintentos y recuperación después de reiniciar el servidor.
- Orden: vencidas primero; dentro de cada grupo, prioridad alta → media → baja; luego fecha más cercana; sin fecha al final de su prioridad. No se utiliza una puntuación de urgencia oculta.
- Contadores sin título general, dirección seleccionable, modificación exclusiva del creador, historial al tocar el texto y eliminación con confirmación. Panel lateral en PC; panel emergente inferior en móvil.
- Notificaciones internas por vencimiento de tareas y creación de un contador por la otra persona. Se pueden descartar. No existen estados de mensajes «Enviado» o «Leído».
- Galería privada con subida por tandas, miniaturas y visor. Secciones Todas, Fotos, Con contraseña, Próximamente y Mis favoritas; comprobación de acceso en cada variante y original.
- Metadatos opcionales y extracción única de fecha EXIF con procedencia explícita; corrección manual por el creador.
- Favoritos personales; un recuerdo diario igual para ambos, elegido solo entre fotos que ambos pueden abrir.
- Álbumes: crear, renombrar, quitar y filtrar; filtro adicional por etiqueta. Nombres y recuentos respetan las restricciones de cada foto.
- Wishlist de experiencias y «Algún día» para compras: nota, precio, enlace e imagen opcionales; edición compartida y estado pendiente/realizado.
- Perfil con nombre, color y avatar editables. Correo fijo, sin cumpleaños.
- Diseño crema, salvia, rosa y lavanda; formularios y navegación adaptables a móvil.

## Alcance completado

Los módulos pendientes del alcance acordado están implementados en 0.5.0. Sus reglas están en [docs/ALCANCE.md](docs/ALCANCE.md), [docs/GALERIA.md](docs/GALERIA.md) y [docs/PLANES.md](docs/PLANES.md). Queda comprobar esta versión en el servidor y los navegadores reales; no se afirma que esté desplegada.

Esta entrega contiene código funcional, no datos de ejemplo ni contraseñas predefinidas. No fue instalada en el servidor del usuario. La conexión y el envío real por Gmail requieren completar la configuración.

## 1. Requisitos

- Node.js 22.12 o posterior compatible con las dependencias fijadas en `package-lock.json`.
- npm y MariaDB. Se recomienda compilar en otra máquina para reducir carga en el servidor de 4 GB.
- En producción: Nginx, certificado HTTPS y un usuario Linux sin privilegios para el servicio.

## 2. Preparar MariaDB

En una sesión administrativa de MariaDB, crea la base y una cuenta dedicada. Sustituye la contraseña del ejemplo:

```sql
CREATE DATABASE nuestro_espacio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nuestro_espacio'@'127.0.0.1' IDENTIFIED BY 'SUSTITUIR_POR_UNA_CONTRASENA_LARGA';
GRANT ALL PRIVILEGES ON nuestro_espacio.* TO 'nuestro_espacio'@'127.0.0.1';
```

Los privilegios DDL son necesarios al ejecutar migraciones. Tras ellas puede utilizarse otra cuenta de ejecución con SELECT, INSERT, UPDATE y DELETE. La API nunca sincroniza ni modifica automáticamente el esquema al iniciar.

## 3. Configurar el proyecto

Desde la carpeta `nuestro-espacio`:

```bash
npm ci
cp backend/.env.example backend/.env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Pega el resultado del último comando en `AUTH_SECRET`. Completa `DB_PASSWORD` y las dos contraseñas temporales (entre 4 y 128 caracteres). No reutilices la contraseña de Gmail. Los correos fijos son:

| Perfil | Correo |
|---|---|
| Ronaldo | ronaldomoradiaz08@gmail.com |
| Scarlet | scarreyesg22@gmail.com |

No subas `.env` a Git. Se incluye solamente `.env.example`.

## 4. Compilar, migrar y crear cuentas

```bash
npm run build
npm run db:migrate
npm run db:seed
npm run user:list
npm run dev
```

Abre `http://localhost:5173`. La API escucha en `127.0.0.1:3000`, y Vite envía `/api` al backend. Elige un perfil, entra con su contraseña temporal y establece la definitiva. Después, elimina `RONALDO_INITIAL_PASSWORD` y `SCARLET_INITIAL_PASSWORD` de `.env`. Volver a ejecutar el seed no cambia usuarios existentes.

Las fechas se muestran e introducen en hora de Costa Rica (`America/Costa_Rica`). Los instantes se almacenan como milisegundos Unix en columnas `double`; no se depende de la zona horaria del sistema o la base de datos.

## 5. Gmail

Completa en `backend/.env`:

```dotenv
MAIL_USER=cuenta-que-envia@gmail.com
MAIL_APP_PASSWORD=contraseña-de-aplicacion
MAIL_FROM=cuenta-que-envia@gmail.com
```

Se utiliza SMTP con TLS en `smtp.gmail.com:465`. La cuenta emisora debe admitir contraseñas de aplicación y tener la verificación en dos pasos configurada. Consulta la [guía oficial de Google](https://support.google.com/accounts/answer/185833?hl=es). No se envía la contraseña de acceso al sitio: únicamente un código temporal. El código se guarda como HMAC y no se escribe en registros.

Sin configuración o ante un fallo de SMTP, la recuperación presenta un error; no simula un envío exitoso. Las tareas y notificaciones internas siguen funcionando. Los avisos internos funcionan aunque Gmail falle. Los recordatorios por correo se procesan por una cola persistente; la opción solo se habilita cuando Gmail está configurado.

## 6. Recuperación desde el servidor

Desde la raíz del proyecto, con acceso al servidor y a su `.env`:

```bash
npm run user:reset -- ronaldo
npm run user:reset -- scarlet
npm run user:unlock -- ronaldo
npm run user:list
```

`user:reset` muestra una contraseña temporal aleatoria una vez, invalida todas las sesiones y códigos de recuperación, y obliga a cambiarla al ingresar. No redirijas esa salida a registros compartidos. `user:unlock` retira el bloqueo de cuenta; el límite temporal de solicitudes por IP se mantiene. No hay una operación para dejar una cuenta sin contraseña.

## 7. Servidor Debian

1. Copia el proyecto a `/opt/nuestro-espacio` y asigna la propiedad al usuario del servicio.
2. Instala dependencias, compila, configura la base y ejecuta las migraciones como se indica arriba.
3. Configura `PHOTO_STORAGE_DIR=/var/lib/nuestro-espacio/gallery` y la carpeta persistente con permisos del usuario de servicio según `docs/ACTUALIZAR.md`. En `backend/.env`, establece `NODE_ENV=production`, `WEB_ORIGIN=https://TU_DOMINIO` y `COOKIE_SECURE=true`. `WEB_ORIGIN` debe contener solo el origen, sin barra final ni ruta.
4. Configura tu certificado HTTPS y adapta `deploy/nginx.conf`. Sirve `frontend/dist` y reenvía `/api/` a `127.0.0.1:3000`.
5. Adapta usuario/rutas de `deploy/nuestro-espacio.service`, verifica el ejecutable de Node y copia la unidad a `/etc/systemd/system/`.
6. Valida Nginx y luego inicia el servicio:

```bash
sudo nginx -t
sudo systemctl daemon-reload
sudo systemctl enable --now nuestro-espacio
sudo systemctl reload nginx
sudo systemctl status nuestro-espacio
```

No se publica el puerto 3000. Nginx sobrescribe `X-Forwarded-For` con la IP cliente; Nest solo confía en el proxy local. Las peticiones que modifican datos exigen un encabezado `Origin` que coincida con `WEB_ORIGIN`.

Para instalar únicamente dependencias de ejecución en un servidor sin compilación, usa `npm ci --omit=dev` y copia también los directorios `backend/dist` y `frontend/dist` generados en una máquina de compilación. Los scripts de administración utilizan JavaScript compilado y no requieren `ts-node`.

## 8. Verificación

```bash
npm test
npm run build
```

Se incluyen 66 pruebas automatizadas: integración de API con NestJS real y SQL.js desechable, recurrencias y migración incremental. Cubren las funciones anteriores, contraseñas de 4 caracteres, aislamiento de agenda/recordatorios, recurrencias mensuales y anuales, doble finalización de tareas, conservación de campos en PATCH y reintentos/recuperación de correo. También verifican aislamiento de mensajes futuros, edición/cancelación, recuperación por un nuevo worker, eliminación por participante, respuestas autorizadas, paginación y conservación de datos al actualizar de 0.2.0. Ejecutan cinco migraciones sin `synchronize`. La galería se verifica además con archivos reales temporales: privacidad de todas las variantes, EXIF/orientación, intentos de contraseña, publicación/limpieza, paginación y exclusión de subidas simultáneas. Se añaden favoritos personales, privacidad de álbumes/filtros, recuerdo compartido estable, avatares autenticados, listas compartidas con control de versiones, imágenes privadas y actualización desde el esquema 0.4.0.

**Límites de la validación de esta entrega:** no se ejecutó contra una instancia MariaDB real; las pruebas SQL.js no verifican bloqueos concurrentes ni particularidades del motor MariaDB. No se realizó revisión visual en navegador ni envío real por Gmail. La compilación de frontend/backend y las pruebas automatizadas sí se ejecutaron. Antes de usar datos personales reales, sigue [docs/PRUEBA_EN_SERVIDOR.md](docs/PRUEBA_EN_SERVIDOR.md).

## Organización

```text
backend/src/auth/            Sesiones y recuperación
backend/src/users/           Perfil
backend/src/tasks/           Tareas privadas y recurrentes
backend/src/agenda/          Eventos, recordatorios y recurrencias
backend/src/mail/            Gmail y cola persistente
backend/src/together/        Mensajes, programación y peticiones
backend/src/gallery/         Fotos privadas, metadatos y procesamiento
backend/src/plans/           Álbumes, favoritos, avatares y listas compartidas
backend/src/counters/        Contadores e historial
backend/src/notifications/   Notificaciones y procesamiento periódico
backend/src/database/        Entidades y migraciones
backend/src/cli/             Administración local
backend/test/                Pruebas de integración
frontend/src/components/    Formularios, contadores y componentes comunes
frontend/src/pages/         Inicio, acceso, perfil y notificaciones
frontend/src/services/      API, tipos y fechas
frontend/src/styles/        Diseño adaptable
deploy/                     Plantillas Nginx y systemd
docs/                       Alcance, contrato API y prueba en servidor
```

## Reglas de agenda y recordatorios

- Agenda personal: solo la ve su propietario. Al editar/eliminar una serie se modifica la serie completa, no una fecha aislada.
- En meses sin el día original se usa el último día del mes, conservando el ancla: 31 enero → 28 febrero → 31 marzo.
- Al completar una tarea recurrente se crea una sola siguiente fecha futura, saltando repeticiones ya vencidas. El historial completado con sucesor no se reabre para evitar duplicar pendientes. Para detener la serie, elige «No se repite» en la tarea pendiente.
- Los recordatorios personales solo los ve su destinatario. Los dirigidos a la otra persona los ven ambos; el creador puede eliminarlos y el destinatario completarlos incluso antes de la fecha.
- Si el servidor estuvo apagado, los avisos pendientes se recuperan al encender. Las series de eventos generan un solo aviso atrasado y avanzan a la siguiente fecha de aviso futura, evitando una avalancha de correos.
- Un aviso por correo cuyo envío ya comenzó puede llegar aunque el elemento se elimine. La cola usa entrega con reintentos; ante una caída entre aceptación SMTP y confirmación en BD puede haber un duplicado. No se promete entrega exactamente una vez.
- Límites: hasta 200 eventos/series por usuario, consultas de agenda de máximo 42 días, hasta 1000 recordatorios creados por persona.

## Reglas de mensajes y peticiones

- Entra en **Nosotros** para acceder a Mensajes y Peticiones. En móvil, Recordatorios, Notificaciones y Perfil están en **Más**; se mantienen cinco botones en la barra inferior.
- Los mensajes programados se guardan en MariaDB. Solo el creador ve su contenido hasta que el proceso de entrega los habilita. Puede corregir el texto, cambiar la fecha o cancelar antes de ese momento.
- El worker revisa hasta 50 mensajes por ciclo de 15 segundos. Tras una interrupción del servidor entrega los pendientes en lotes; no promete puntualidad al segundo. El navegador consulta novedades cada 30 segundos mientras está visible.
- **Eliminar de mi vista** no borra la copia de la otra persona. El registro se elimina cuando ambos lo han quitado. No hay papelera ni recuperación de la copia oculta desde la interfaz. Tampoco se informa al otro de esta acción.
- No hay recibos de lectura ni indicadores Enviado/Leído. Los campos técnicos de entrega y eliminación no se devuelven en la API; únicamente se indica al creador si sigue programado.
- Las peticiones solo las responde el destinatario, con una nota opcional. Puede cambiar su respuesta; ambos ven la respuesta actual, sin historial de respuestas. El creador puede eliminar la petición y su respuesta para ambos, con confirmación.
- «Dame un chance» no crea, ofrece ni programa un recordatorio. Ninguna respuesta lo hace.
- Mensajes y peticiones generan únicamente notificaciones internas; no envían correos.
- Límites: mensaje de 5000 caracteres, hasta 5000 mensajes propios visibles/programados, hasta 1000 peticiones creadas. Listados de 20 por página. Ocultar un mensaje no elimina la copia que el otro conserva; el almacenamiento retenido puede seguir creciendo.

## Galería

Entra en **Fotos** (o **Más → Nuestras fotos** en móvil). Admite JPEG/PNG/WebP, hasta 20 MiB y 40 megapíxeles por archivo, y tandas de 30 que se suben individualmente. La fecha futura se comprueba antes de la contraseña para el destinatario; el creador mantiene acceso a sus propias fotos. Consulta [docs/GALERIA.md](docs/GALERIA.md) para las reglas, fechas EXIF y límites.

En producción se exige `PHOTO_STORAGE_DIR` con una ruta absoluta persistente y privada, fuera del código y de la raíz web. La nueva plantilla systemd permite escritura en `/var/lib/nuestro-espacio`. Instala las dependencias Sharp/exifr en el sistema donde se ejecutará la API.

## Respaldo

Respalda como conjunto MariaDB, `PHOTO_STORAGE_DIR` y `.env`, de forma privada. Detén temporalmente las escrituras para que la copia de archivos y base sea coherente y prueba su restauración aparte. Conservar solo MariaDB no conserva los originales ni las variantes. No ejecutes migraciones regresivas sobre datos reales sin un respaldo y una revisión de su impacto.
