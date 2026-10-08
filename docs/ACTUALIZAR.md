> **Actualización a 0.6.0:** sigue primero [VIDEOS.md](VIDEOS.md), que añade la sexta migración, ffprobe, almacenamiento y Nginx para videos. Los pasos siguientes documentan la actualización histórica a 0.5.0.

# Actualizar de 0.4.0 a 0.5.0 (también admite versiones anteriores)

Esta entrega añade favoritos, recuerdo diario, álbumes, avatares y listas compartidas y conserva cuentas, contraseñas, tareas, agenda, recordatorios, contadores, mensajes, peticiones y notificaciones. No ejecutes el seed para una actualización y no sobrescribas `backend/.env` con el ejemplo. Desde 0.1.0, 0.2.0 o 0.3.0 también se ejecutarán las migraciones intermedias pendientes.

## 1. Detener y respaldar

En desarrollo detén `npm run dev` con Ctrl+C. Si usas la unidad incluida en Debian:

```bash
sudo systemctl stop nuestro-espacio
mariadb-dump -h 127.0.0.1 -u nuestro_espacio -p --single-transaction nuestro_espacio > nuestro_espacio_antes_0.5.0.sql
```

Adapta usuario/nombre de base a tu instalación. Guarda el respaldo, el código anterior y una copia privada de `backend/.env` fuera de la carpeta pública. Con el servicio detenido, copia también toda la carpeta `PHOTO_STORAGE_DIR` (incluida `assets` si existe). Conserva ese conjunto junto; no basta con copiar la base.

## 2. Definir dónde se guardarán las fotos

Si ya vienes de 0.4.0, conserva exactamente la misma carpeta y sus archivos; no la vacíes ni vuelvas a crear sus datos. El backend añadirá el subdirectorio privado `assets` para avatares e imágenes de listas.

Las fotos deben sobrevivir a futuras sustituciones del código. Para el servidor, añade en tu `backend/.env`:

```dotenv
PHOTO_STORAGE_DIR=/var/lib/nuestro-espacio/gallery
```

Crea la carpeta y asigna acceso al usuario real del servicio; los siguientes comandos usan el de la plantilla:

```bash
sudo install -d -m 700 -o nuestro-espacio -g nuestro-espacio /var/lib/nuestro-espacio/gallery
```

Si tu servicio usa `ProtectSystem=strict`, añade a su sección `[Service]` estas líneas (ya incluidas en la nueva plantilla):

```ini
StateDirectory=nuestro-espacio
StateDirectoryMode=0700
ReadWritePaths=/var/lib/nuestro-espacio
```

No reemplaces a ciegas la unidad: conserva tu usuario, rutas y ejecutable de Node. Recarga su definición después de editarla:

```bash
sudo systemctl daemon-reload
```

En desarrollo puede omitirse la variable: se utiliza `storage/gallery` relativo al proceso del backend. En producción se exige una ruta absoluta. En cualquier instalación, la carpeta debe ser privada y escribible por el backend. Nunca la coloques dentro de `frontend/dist`, `public`, ni en un `alias`/`root` de Nginx.

## 3. Copiar, instalar, compilar y migrar

Extrae el ZIP en una carpeta nueva y copia tu `.env` ya actualizado a `nuestro-espacio/backend/.env`. No copies `node_modules` ni `dist` antiguos. Desde la raíz del nuevo proyecto:

```bash
npm ci
npm run build
npm run db:migrate
```

La migración `Finishing1791440000000` añade `albums`, `photo_favorites`, `daily_memories`, `private_assets` y `wishes`, más `users.avatarId` y `photos.albumId`, índices y relaciones. Convierte los nombres de álbum existentes en registros conservando las fotos, sus hashes y metadatos. Está registrada junto a las migraciones previas y permite reanudar las operaciones DDL de esta entrega si se interrumpen. No borres la tabla de migraciones ni actives `synchronize`.

0.5.0 no añade dependencias respecto de 0.4.0; Sharp y exifr llegaron en 0.4.0. Instala las dependencias en el sistema/arquitectura donde ejecutarás el backend; no transfieras `node_modules` de Windows a Debian. El ZIP contiene fuentes, no binarios ni fotos personales.

## 4. Ajustar Nginx

Si ya aplicaste 0.4.0, conserva estos valores. La configuración de 0.3.0 y anteriores limitaba las solicitudes a 64 KiB. En el bloque HTTPS de tu sitio cambia el límite y, dentro de `location /api/`, el tiempo de espera:

```nginx
client_max_body_size 21m;
```

```nginx
proxy_read_timeout 120s;
```

Se admiten archivos de hasta 20 MiB más el formulario. Mantén la raíz apuntando exclusivamente a `frontend/dist`; los originales y variantes pasan por la API autenticada. No agregues una ubicación pública para las fotos.

```bash
sudo nginx -t
```

Recarga Nginx solo si la validación anterior es correcta:

```bash
sudo systemctl reload nginx
```

## 5. Arrancar y revisar

Coloca el nuevo código en la ruta que ya usa systemd y conserva sus permisos. Sirve el nuevo `frontend/dist`.

```bash
sudo systemctl start nuestro-espacio
sudo systemctl status nuestro-espacio
```

En desarrollo usa `npm run dev`. Abre **Fotos** en escritorio o **Más → Nuestras fotos** en móvil. Comprueba:

- Tus datos anteriores siguen presentes y entras con la misma contraseña.
- Una foto normal se ve desde ambos perfiles; solo el creador puede editarla/eliminarla.
- Una protegida no muestra su contenido ni detalles hasta desbloquearla.
- Una foto futura aparece en Próximamente. Si también tiene contraseña, primero debe llegar la fecha.
- La fecha de cámara indica su procedencia; si no existe EXIF no se inventa a partir del nombre del archivo.
- Los archivos persisten al reiniciar el backend. No elimines ni sustituyas `PHOTO_STORAGE_DIR` al actualizar el código.

Comprueba además favoritos separados entre perfiles, álbumes existentes migrados, mismo recuerdo en ambos inicios, carga/eliminación de avatar y las dos listas en **Planes** (móvil: **Más → Wishlist y Algún día**).

Ver más casos en `PRUEBA_EN_SERVIDOR.md` y las reglas en `GALERIA.md` y `PLANES.md`.

## Respaldos desde esta versión

La base y los archivos forman un conjunto. Detén temporalmente la aplicación para obtener un respaldo coherente; guarda el dump de MariaDB, la carpeta completa `PHOTO_STORAGE_DIR` y `.env` de forma privada. Restaura ese mismo conjunto en un entorno separado antes de depender del respaldo. Respaldar solo MariaDB no guarda las fotos.

Para volver exactamente al estado anterior, detén el servicio, restaura el respaldo en una base separada y configura el código anterior para esa base. No uses `down` como sustituto de un respaldo: elimina las nuevas tablas y no recupera archivos ni datos creados después de la copia. Si ya se subieron fotos con esta versión, consérvalas junto a una copia de su base antes de retroceder.

## Límite de comprobación

Compilación y pruebas automáticas con SQL.js/archivos temporales realizadas. Falta validar MariaDB, los bloqueos concurrentes y la interfaz en tu navegador/servidor reales. La confirmación de que 0.3.0 funciona no sustituye estas comprobaciones de 0.5.0.
