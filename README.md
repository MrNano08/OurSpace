# OurSpace — Nuestro Espacio

**Aplicación web privada, autoalojada y desarrollada con React, NestJS y MariaDB.**

OurSpace reúne tareas, agenda, recordatorios, mensajes, fotografías, vídeos y una biblioteca de lectura en una misma aplicación para **dos perfiles autenticados**. Se diseñó como un proyecto personal full-stack, con énfasis en la separación de información por usuario, el almacenamiento privado de archivos y el funcionamiento en un servidor Linux propio.

> **Estado del código:** versión `0.8.1` según los `package.json` del repositorio. Es una aplicación de uso privado, no un servicio público de aregistro abierto ni una plataforma multiusuario general. Algunas funciones multimedia deben habilitarse explícitamente y requieren configuración del servidor.

## Funcionalidades

| Área | Funcionalidades implementadas |
| --- | --- |
| Acceso y perfiles | Dos cuentas predefinidas, inicio de sesión con cookie, edición de perfil y avatar, cambio y recuperación de contraseña por correo. |
| Tareas | Tareas por perfil, prioridades, vencimientos y repetición diaria, semanal, mensual o anual. |
| Agenda y recordatorios | Eventos personales, recurrencias, avisos internos y notificaciones por correo opcionales. |
| Interacción compartida | Mensajes inmediatos o programados, peticiones con respuestas y notificaciones internas. |
| Contadores y planes | Contadores con historial, listas compartidas de experiencias y deseos de compra. |
| Galería | Fotografías y álbumes privados, favoritos, metadatos, miniaturas, control de acceso y fotos protegidas o programadas. |
| Vídeos | Biblioteca MP4 con carpetas, subida por bloques reanudable, miniaturas, favoritos y progreso por perfil. |
| Ver juntos | Sesiones de reproducción sincronizada; módulo opcional, desactivado por defecto. |
| Mangas | Biblioteca con obras, volúmenes, capítulos con imágenes o PDF, visor, progreso y notas individuales; módulo opcional, desactivado por defecto. |
| Navegación | Interfaz adaptable y rutas con historial para conservar vistas al recargar o usar Atrás/Adelante. |

La aplicación **no** incluye cuentas de registro público, procesamiento de pagos, almacenamiento en la nube obligatorio ni acceso anónimo a los archivos personales.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, CSS, Lucide React, PDF.js |
| Backend | Node.js, NestJS 11, TypeScript, Express |
| Datos | MariaDB, TypeORM, migraciones SQL |
| Autenticación | Sesiones persistidas en base de datos, cookies `HttpOnly`, `scrypt` para contraseñas |
| Multimedia | Sharp, exifr, FFmpeg/ffprobe, almacenamiento privado local |
| Notificaciones | Nodemailer, SMTP y trabajadores de procesamiento |
| Producción | Debian GNU/Linux, Nginx como proxy inverso, servicio systemd |
| Pruebas | Node Test Runner, Supertest, SQL.js; scripts adicionales de navegador |

### Arquitectura

```text
Navegador
   │
   ▼
React + TypeScript + Vite
   │ /api
   ▼
Nginx (en producción)
   │
   ▼
NestJS / Express
   ├── TypeORM ─────────► MariaDB
   ├── almacenamiento ─► fotografías, vídeos y mangas privados
   ├── SMTP ────────────► avisos y recuperación de acceso
   └── FFmpeg / Sharp ──► procesamiento y validación de medios
```

Los archivos privados no deben publicarse en `frontend/dist`. El backend comprueba permisos antes de permitir su acceso; en producción, Nginx puede entregar archivos mediante rutas internas autorizadas.

## Estructura del repositorio

```text
backend/
  src/
    auth/            Autenticación y sesiones
    tasks/           Tareas
    agenda/          Agenda y recordatorios
    together/        Mensajes y peticiones
    gallery/         Fotografías y álbumes
    videos/          Biblioteca de vídeos y Ver juntos
    mangas/          Biblioteca, lectura y notas
    plans/           Listas y planes compartidos
    notifications/   Notificaciones
    mail/            Correo y trabajadores
    database/        Entidades y migraciones
  test/              Pruebas del backend
frontend/
  src/
    components/      Componentes e interfaces multimedia
    pages/           Vistas de la aplicación
    services/        Cliente de API y utilidades
    styles/          Estilos
scripts/             Herramientas auxiliares y escenarios de prueba
deploy/              Ejemplos de Nginx y systemd
docs/                Guías de módulos, actualizaciones y validación
```

## Ejecutar en desarrollo

### Requisitos

- **Node.js 22.13.0 o superior** y npm.
- **MariaDB** accesible desde el backend.
- **FFmpeg/ffprobe** para las funciones de vídeo y las pruebas correspondientes.
- Para validar PDF de mangas: `pdfinfo` (Poppler) y `prlimit` (util-linux).

> Usa una base de datos nueva o de pruebas. **Nunca** ejecutes el comando de creación de cuentas (`db:seed`) sobre una instalación real que estés actualizando.

### 1. Instalar dependencias

Desde la raíz del repositorio:

```bash
npm ci
cp backend/.env.example backend/.env
```

### 2. Configurar el entorno

Edita `backend/.env` con las credenciales **locales** de MariaDB, el origen web (`WEB_ORIGIN`) y un secreto de autenticación aleatorio. Para generarlo:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado en `AUTH_SECRET`. Configura los correos y las contraseñas iniciales de **tus propios perfiles de prueba** antes de crear las cuentas. No publiques `.env`, bases de datos, respaldos, claves ni contenido multimedia.

La plantilla de variables está en [`backend/.env.example`](backend/.env.example). Modifica sus valores de muestra antes de utilizarla.

### 3. Preparar la base

Crea una base MariaDB y un usuario con acceso restringido a esa base. Después:

```bash
npm run build
npm run db:migrate
npm run db:seed
```

`db:seed` es solo para **una instalación inicial vacía** y crea las cuentas configuradas para ese entorno. Tras completar el primer acceso, retira las contraseñas iniciales del `.env`.

### 4. Iniciar la aplicación

```bash
npm run dev
```

- Interfaz de desarrollo: `http://localhost:5173`
- API local: `http://127.0.0.1:3000/api`

El frontend utiliza el proxy de Vite para comunicarse con la API en desarrollo. Las funciones de correo necesitan una cuenta SMTP configurada; sin ella, algunas operaciones de recuperación o avisos por correo no estarán disponibles.

## Módulos opcionales

Los siguientes controles aparecen en el archivo de configuración:

```dotenv
WATCH_TOGETHER_ENABLED=false
MANGAS_ENABLED=false
VIDEO_FASTSTART=true
```

- **Ver juntos:** consulta [`docs/VER_JUNTOS.md`](docs/VER_JUNTOS.md) para requisitos y activación.
- **Mangas:** consulta [`docs/MANGAS.md`](docs/MANGAS.md) para la migración correspondiente, almacenamiento, límites de PDF y entrega privada.
- **Vídeos:** consulta [`docs/VIDEOS.md`](docs/VIDEOS.md) para subida reanudable, FFmpeg, permisos y almacenamiento.

No actives los módulos únicamente cambiando una variable sin comprobar primero las migraciones y el almacenamiento que necesitan.

## Pruebas

```bash
npm run build
npm test
```

Las pruebas del backend cubren autenticación, recurrencias, migraciones, galería, vídeo, sincronización y mangas. El repositorio también incluye scripts de pruebas de navegador que necesitan herramientas adicionales y un entorno aislado. Para conocer el alcance y las limitaciones de las verificaciones registradas, consulta [`docs/VALIDACION_0.8.0.md`](docs/VALIDACION_0.8.0.md) y [`docs/NAVEGACION_0.8.1.md`](docs/NAVEGACION_0.8.1.md).

**Nota:** la existencia de pruebas en el repositorio no garantiza que el despliegue real esté validado. Las pruebas incluidas utilizan, entre otros recursos, SQL.js para escenarios aislados; la instalación con MariaDB y los dispositivos reales requiere verificación propia.

## Despliegue privado

Hay ejemplos de configuración en [`deploy/`](deploy/) para Nginx y systemd, así como instrucciones en [`docs/ACTUALIZAR.md`](docs/ACTUALIZAR.md) y [`docs/PRUEBA_EN_SERVIDOR.md`](docs/PRUEBA_EN_SERVIDOR.md).

Para un despliegue seguro:

1. Configura HTTPS, `NODE_ENV=production`, `COOKIE_SECURE=true` y un `WEB_ORIGIN` correcto.
2. Usa una cuenta Linux sin privilegios y una base de datos dedicada.
3. Conserva fotografías, vídeos y mangas **fuera** del directorio público y del árbol de compilación.
4. Realiza respaldos coordinados de MariaDB y de las carpetas privadas de archivos.
5. Ejecuta las migraciones pertinentes antes de activar nuevas funciones. No ejecutes `db:seed` durante una actualización.
6. Verifica los permisos de lectura y escritura, la configuración de Nginx y las rutas internas antes de publicar.

Este repositorio documenta una aplicación autoalojada; no ofrece acceso público de demostración ni incluye datos de prueba listos para compartir.

## Seguridad, privacidad y limitaciones

OurSpace fue concebido para **dos perfiles de confianza**, no como servicio abierto a Internet para usuarios desconocidos. Las operaciones sobre contenido privado dependen de comprobaciones de sesión y autorización; las galerías y bibliotecas requieren almacenamiento persistente protegido.

**Limitación relevante del código actual:** el proyecto acepta contraseñas desde **cuatro caracteres**. Aunque incluye derivación de claves y limitación de intentos, esa longitud mínima no es recomendable para cuentas expuestas a Internet. Es una configuración que debe reforzarse antes de plantear un uso público más amplio.

El código público **no debe incluir** datos personales reales, volcados de base de datos, tokens de sesión, contraseñas, correos privados, respaldos ni fotografías o vídeos de usuarios. Este README describe el funcionamiento técnico, no autoriza la distribución de contenido privado.

## Documentación complementaria

- [Alcance y reglas](docs/ALCANCE.md)
- [Contrato de API](docs/API.md)
- [Galería](docs/GALERIA.md)
- [Vídeos](docs/VIDEOS.md)
- [Ver juntos](docs/VER_JUNTOS.md)
- [Mangas](docs/MANGAS.md)
- [Navegación 0.8.1](docs/NAVEGACION_0.8.1.md)
- [Pruebas y despliegue](docs/PRUEBA_EN_SERVIDOR.md)

---

**Tipo de proyecto:** personal / full-stack / self-hosted.  
**Versión revisada del código:** `0.8.1`.
