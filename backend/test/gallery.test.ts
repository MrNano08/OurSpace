import 'reflect-metadata';
import { beforeEach,afterEach,test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp,rm,readdir,readFile,mkdir,utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';
import { Config } from '../src/common/config';
import { entities,User,Notification } from '../src/database/entities';
import { Photo,PhotoAccess } from '../src/gallery/entities';
import { GalleryService } from '../src/gallery/gallery.service';
import { PhotoStorage } from '../src/gallery/storage';
import { Gallery1791430000000 } from '../src/database/migrations/1791430000000-gallery';
import { migrations } from '../src/database/data-source';
import { seed } from '../src/cli/manage';
import { MailService } from '../src/mail/mail.service';
import { AssetsService } from '../src/plans/assets.service';
import { Finishing1791440000000 } from '../src/database/migrations/1791440000000-finishing';
import { validCameraDate } from '../src/gallery/metadata';
const config:Config={NODE_ENV:'test',PORT:3000,HOST:'127.0.0.1',WEB_ORIGIN:'http://localhost:5173',COOKIE_SECURE:false,DB_HOST:'localhost',DB_PORT:3306,DB_USERNAME:'test',DB_PASSWORD:'test',DB_DATABASE:'test',AUTH_SECRET:'only-tests-123456789012345678901234567890',RONALDO_EMAIL:'ronaldo@example.test',SCARLET_EMAIL:'scarlet@example.test',MAIL_USER:'',MAIL_APP_PASSWORD:'',MAIL_FROM:''};
let db:DataSource,app:INestApplication,dir:string,png:Buffer,a:string,b:string,ownerId:string,peerId:string;
beforeEach(async()=>{
  dir=await mkdtemp(join(tmpdir(),'nuestro-gallery-'));config.PHOTO_STORAGE_DIR=dir;
  db=await new DataSource({type:'sqljs',entities,migrations,synchronize:false}).initialize();await db.runMigrations();
  process.env.RONALDO_INITIAL_PASSWORD='abcd';process.env.SCARLET_INITIAL_PASSWORD='abcd';await seed(db,config);await db.getRepository(User).createQueryBuilder().update().set({mustChangePassword:false}).execute();
  app=await NestFactory.create(AppModule.register(config,db,{available:()=>false} as MailService,false),{logger:false});app.setGlobalPrefix('api');app.use(cookieParser());await app.init();
  async function login(slug:string){const r=await request(app.getHttpServer()).post('/api/auth/login').set('Origin',config.WEB_ORIGIN).send({slug,password:'abcd'}).expect(201);return {cookie:(r.headers['set-cookie'] as unknown as string[])[0].split(';')[0],id:r.body.id};}
  const first=await login('ronaldo'),second=await login('scarlet');a=first.cookie;b=second.cookie;ownerId=first.id;peerId=second.id;
  png=await sharp({create:{width:120,height:80,channels:3,background:'#bcc9ae'}}).png().toBuffer();
});
afterEach(async()=>{if(app)await app.close();if(db?.isInitialized)await db.destroy();await rm(dir,{recursive:true,force:true});});
function upload(metadata:unknown={},buffer=png,cookie=a){return request(app.getHttpServer()).post('/api/gallery').set('Cookie',cookie).set('Origin',config.WEB_ORIGIN).field('metadata',JSON.stringify(metadata)).attach('file',buffer,{filename:'2020-01-01.png',contentType:'image/png'});}
function get(path:string,cookie=b){return request(app.getHttpServer()).get('/api'+path).set('Cookie',cookie);}
function unlock(id:string,password='test'){return request(app.getHttpServer()).post('/api/gallery/'+id+'/unlock').set('Cookie',b).set('Origin',config.WEB_ORIGIN).send({password});}

test('Subida genera originales privados y variantes decodificables, sin inventar fecha por nombre de archivo',async()=>{
  const p=(await upload({description:'Un recuerdo',tags:['playa','playa']}).expect(201)).body;
  assert.equal(p.ownerId,ownerId);assert.equal(p.capturedAt,null);assert.equal(p.dateSource,'none');assert.deepEqual(p.tags,['playa']);assert.equal(p.passwordHash,undefined);
  const original=await get(`/gallery/${p.id}/file/original`).expect(200);assert.deepEqual(original.body,png);assert.match(original.headers['content-disposition'],/attachment/);assert.match(original.headers['cache-control'],/no-store/);
  for(const variant of ['thumb','medium']){const image=await get(`/gallery/${p.id}/file/${variant}`).expect(200);assert.equal(image.headers['content-type'],'image/webp');const m=await sharp(image.body).metadata();assert.equal(m.format,'webp');assert.equal(m.exif,undefined);assert.ok(m.width!<=1800);}
  await request(app.getHttpServer()).get(`/api/gallery/${p.id}/file/thumb`).expect(401);await get(`/storage/gallery/${p.id}/original`).expect(404);
  assert.equal((await get('/gallery')).body.items.length,1);assert.equal(await db.getRepository(Notification).countBy({kind:'photo',userId:peerId}),1);
});

test('Contraseña bloquea todas las variantes y los metadatos, mientras el creador conserva acceso',async()=>{
  const p=(await upload({description:'No filtrar este texto',location:'Privado',album:'Sorpresa',tags:['oculta'],password:'test'}).expect(201)).body;
  const detail=(await get('/gallery/'+p.id).expect(200)).body;assert.equal(detail.accessible,false);assert.equal(detail.description,undefined);assert.equal(detail.tags,undefined);assert.equal(detail.format,undefined);
  const list=(await get('/gallery?section=protected')).body;assert.equal(list.items.length,1);assert.equal(JSON.stringify(list).includes('No filtrar'),false);
  for(const variant of ['thumb','medium','original'])await get(`/gallery/${p.id}/file/${variant}`).expect(403);
  await get(`/gallery/${p.id}/file/original`,a).expect(200);
  const result=(await unlock(p.id).expect(201)).body;assert.equal(result.accessible,true);assert.equal(result.description,'No filtrar este texto');assert.equal(result.passwordHash,undefined);
  await get(`/gallery/${p.id}/file/thumb`).expect(200);assert.equal((await get('/gallery?section=protected')).body.items[0].accessible,true);
  // Grant survives a new service instance; it is stored in DB, not in browser memory.
  assert.equal((await new GalleryService(db,app.get(PhotoStorage)).detail(p.id,peerId)).accessible,true);
});

test('Fecha tiene precedencia sobre contraseña: no revela bytes, no acepta intentos y no crea permiso antes de tiempo',async()=>{
  const p=(await upload({password:'test',unlockAt:Date.now()+3600000,description:'Sorpresa futura'}).expect(201)).body;
  await unlock(p.id).expect(403);assert.equal(await db.getRepository(PhotoAccess).count(),0);assert.equal(await db.getRepository(Notification).countBy({kind:'photo'}),0);
  assert.equal((await get('/gallery?section=upcoming')).body.items[0].lockReason,'date');assert.equal((await get('/gallery?section=protected')).body.items.length,0);
  for(const variant of ['thumb','medium','original'])await get(`/gallery/${p.id}/file/${variant}`).expect(403);
  await db.getRepository(Photo).update(p.id,{unlockAt:Date.now()-1});
  assert.equal((await get('/gallery/'+p.id)).body.lockReason,'password');await get(`/gallery/${p.id}/file/thumb`).expect(403);
  const gallery=app.get(GalleryService);await gallery.maintain();await gallery.maintain();assert.equal(await db.getRepository(Notification).countBy({kind:'photo',resourceId:p.id}),1);
  await unlock(p.id).expect(201);await get(`/gallery/${p.id}/file/original`).expect(200);
});

test('Foto solo programada se abre al llegar la fecha, sin exigir contraseña',async()=>{
  const p=(await upload({unlockAt:Date.now()+3600000}).expect(201)).body;
  assert.equal((await get('/gallery')).body.items.length,0);await get(`/gallery/${p.id}/file/medium`).expect(403);
  await db.getRepository(Photo).update(p.id,{unlockAt:Date.now()-1});assert.equal((await get('/gallery')).body.items[0].accessible,true);await get(`/gallery/${p.id}/file/medium`).expect(200);
});

test('Cinco contraseñas incorrectas persisten el bloqueo y no desbloquean aunque luego se use la correcta',async()=>{
  const p=(await upload({password:'test'}).expect(201)).body;
  for(let i=0;i<4;i++)await unlock(p.id,'wrong').expect(400);await unlock(p.id,'wrong').expect(429);await unlock(p.id).expect(429);
  const access=await db.getRepository(PhotoAccess).findOneByOrFail({photoId:p.id,userId:peerId});assert.equal(access.attempts,5);assert.ok(access.lockedUntil>Date.now());assert.equal(access.unlocked,false);
  await db.getRepository(PhotoAccess).update({photoId:p.id,userId:peerId},{lockedUntil:Date.now()-1});await unlock(p.id).expect(201);
});

test('Metadatos EXIF se extraen con zona explícita cuando existe; variantes se orientan y una corrección es manual',async()=>{
  const image=await sharp({create:{width:120,height:80,channels:3,background:'#ecddbd'}}).withMetadata({orientation:6}).withExifMerge({IFD2:{DateTimeOriginal:'2024:02:29 12:34:56',OffsetTimeOriginal:'-06:00'}}).jpeg().toBuffer();
  const p=(await upload({},image).expect(201)).body;
  assert.equal(p.capturedAt,'2024-02-29T12:34:56');assert.equal(p.captureOffset,'-06:00');assert.equal(p.dateSource,'exif');assert.equal(p.width,80);assert.equal(p.height,120);
  const medium=await get(`/gallery/${p.id}/file/medium`).expect(200);const m=await sharp(medium.body).metadata();assert.equal(m.width,80);assert.equal(m.height,120);assert.equal(m.orientation,undefined);assert.equal(m.exif,undefined);
  const body={description:'Corregida',location:'Playa',album:'Viaje',tags:['juntos'],capturedAt:'2024-03-01T08:30:00'};
  await request(app.getHttpServer()).patch('/api/gallery/'+p.id).set('Cookie',b).set('Origin',config.WEB_ORIGIN).send(body).expect(404);
  const changed=await request(app.getHttpServer()).patch('/api/gallery/'+p.id).set('Cookie',a).set('Origin',config.WEB_ORIGIN).send(body).expect(200);assert.equal(changed.body.dateSource,'manual');assert.equal(changed.body.captureOffset,null);
  assert.equal((await db.getRepository(Photo).findOneByOrFail({id:p.id})).exifCapturedAt,'2024-02-29T12:34:56');
});

test('Validación de archivos, tamaño, sesión, origen y metadatos impide entradas no admitidas',async()=>{
  await upload({},Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100"/></svg>')).expect(400);
  await upload({},Buffer.from('not an image')).expect(400);
  await upload({},Buffer.alloc(20*1024*1024+1)).expect(413);
  await upload({ownerId:peerId}).expect(400);await upload({capturedAt:'2024-02-31T10:00:00'}).expect(400);await upload({password:'abc'}).expect(400);await upload({unlockAt:Date.now()-1000}).expect(400);
  await request(app.getHttpServer()).post('/api/gallery').set('Origin',config.WEB_ORIGIN).field('metadata','{}').attach('file',png,'x.png').expect(401);
  await request(app.getHttpServer()).post('/api/gallery').set('Cookie',a).set('Origin','https://other.example').field('metadata','{}').attach('file',png,'x.png').expect(403);
  assert.equal(await db.getRepository(Photo).count(),0);assert.equal((await readdir(dir)).length,0);assert.equal(validCameraDate('2024-02-29T23:59:59'),true);assert.equal(validCameraDate('2025-02-29T12:00:00'),false);
});

test('Solo el creador elimina: bloquea acceso, purga original y variantes y limpia avisos/permisos',async()=>{
  const p=(await upload({password:'test'}).expect(201)).body;await unlock(p.id).expect(201);
  const remove=(cookie:string)=>request(app.getHttpServer()).delete('/api/gallery/'+p.id).set('Cookie',cookie).set('Origin',config.WEB_ORIGIN);
  await remove(b).expect(404);await remove(a).expect(200);await get('/gallery/'+p.id,a).expect(404);await get(`/gallery/${p.id}/file/thumb`).expect(404);
  assert.equal(await db.getRepository(Photo).count(),0);assert.equal(await db.getRepository(PhotoAccess).count(),0);assert.equal(await db.getRepository(Notification).countBy({resourceId:p.id}),0);assert.equal((await readdir(dir)).length,0);
});

test('Si falla la publicación en DB después de procesar la imagen, se limpian los archivos',async()=>{
  await db.getRepository(User).delete(peerId);await upload().expect(400);assert.equal((await readdir(dir)).length,0);assert.equal(await db.getRepository(Photo).count(),0);
});

test('Solo una subida se recibe/procesa a la vez y el turno se libera al terminar',async()=>{
  const storage=app.get(PhotoStorage),original=storage.prepare.bind(storage);let release!:()=>void,started!:()=>void;
  const hold=new Promise<void>(r=>{release=r;}),began=new Promise<void>(r=>{started=r;});
  storage.prepare=async(id,buffer)=>{started();await hold;return original(id,buffer);};
  const first=upload().then(r=>r);await began;
  try{const blocked=await upload().expect(429);assert.equal(blocked.headers['retry-after'],'5');}finally{release();}
  assert.equal((await first).status,201);storage.prepare=original;await upload().expect(201);
});

test('Paginación por cursor mantiene orden y no incorpora duplicados si se agrega una foto nueva',async()=>{
  const p=(await upload().expect(201)).body;const source=await db.getRepository(Photo).findOneByOrFail({id:p.id});
  await db.getRepository(Photo).save(Array.from({length:25},(_,i)=>({...source,id:randomUUID(),createdAt:source.createdAt-i-1})));
  const first=(await get('/gallery')).body;assert.equal(first.items.length,24);assert.ok(first.nextCursor);
  await upload().expect(201);
  const second=(await get('/gallery?cursor='+first.nextCursor)).body;assert.equal(second.items.length,2);assert.equal(second.nextCursor,null);
  assert.equal(new Set([...first.items,...second.items].map(p=>p.id)).size,26);await get('/gallery?cursor=invalid').expect(400);
});

test('Limpieza de huérfanos solo retira carpetas antiguas sin registro, preservando fotos y subidas recientes',async()=>{
  const p=(await upload().expect(201)).body;const stale=randomUUID(),recent='.tmp-'+randomUUID();await mkdir(join(dir,stale));await mkdir(join(dir,recent));
  const old=new Date(Date.now()-2*86400000);await utimes(join(dir,stale),old,old);await utimes(join(dir,p.id),old,old);
  await app.get(GalleryService).cleanOrphans();const paths=await readdir(dir);assert.ok(paths.includes(p.id));assert.ok(paths.includes(recent));assert.ok(!paths.includes(stale));
  assert.deepEqual(await readFile(join(dir,p.id,'original')),png);
});

test('Migración de galería reanudable no modifica usuarios, mensajes ni permisos de las tablas anteriores',async()=>{
  const before=await db.query('SELECT * FROM users'),runner=db.createQueryRunner(),migration=new Gallery1791430000000();await migration.up(runner);await migration.up(runner);
  assert.deepEqual(await db.query('SELECT * FROM users'),before);const photos=await runner.getTable('photos');assert.equal(photos!.foreignKeys.length,3);assert.equal(photos!.indices.length,3);assert.equal((await runner.getTable('photo_access'))!.foreignKeys.length,2);await runner.release();
});

function change(method:'post'|'patch'|'delete',path:string,body:object={},cookie=a){return request(app.getHttpServer())[method]('/api'+path).set('Cookie',cookie).set('Origin',config.WEB_ORIGIN).send(body);}
function assetUpload(path:string,cookie=a){return request(app.getHttpServer()).post('/api'+path).set('Cookie',cookie).set('Origin',config.WEB_ORIGIN).attach('file',png,'image.png');}
const wishFields=(w:any)=>({title:w.title,notes:w.notes,url:w.url,priceCents:w.priceCents,currency:w.currency,completed:w.completed,revision:w.revision});

test('Favoritas son personales, persistentes e idempotentes; el destinatario no puede marcar fotos bloqueadas',async()=>{
  const p=(await upload({password:'test'}).expect(201)).body;
  await change('post','/collections/favorites/'+p.id,{favorite:true},b).expect(403);
  await change('post','/collections/favorites/'+p.id,{favorite:true}).expect(201);
  await change('post','/collections/favorites/'+p.id,{favorite:true}).expect(201);
  assert.equal((await get('/gallery?section=favorites',a)).body.items.length,1);
  assert.equal((await get('/gallery?section=favorites',b)).body.items.length,0);
  await unlock(p.id).expect(201);assert.equal((await get('/gallery/'+p.id)).body.favorite,false);
  await change('post','/collections/favorites/'+p.id,{favorite:true},b).expect(201);
  await change('post','/collections/favorites/'+p.id,{favorite:false}).expect(201);
  assert.equal((await get('/gallery?section=favorites',a)).body.items.length,0);
  assert.equal((await get('/gallery?section=favorites',b)).body.items[0].id,p.id);
});

test('Álbumes, recuentos y filtros no revelan metadatos de fotos bloqueadas; etiquetas escapan comodines',async()=>{
  const p=(await upload({password:'test',album:'Sorpresa secreta',tags:['100%','a_b']}).expect(201)).body;
  assert.equal((await get('/collections/albums')).body.length,0);
  assert.equal((await get('/collections/albums',a)).body[0].count,1);
  for(const query of ['albumId='+p.albumId,'tag=100%25','tag=a_b'])assert.equal((await get('/gallery?section=all&'+query)).body.items.length,0);
  await unlock(p.id).expect(201);
  await upload({album:'Sorpresa secreta',tags:['100abc','axb']}).expect(201);
  assert.equal((await get('/collections/albums')).body[0].count,2);
  for(const tag of ['100%','a_b'])assert.equal((await get('/gallery?section=all&tag='+encodeURIComponent(tag))).body.items.length,1);
  assert.equal((await get('/gallery?section=all&albumId='+p.albumId)).body.items.length,2);
});

test('Solo el creador administra su álbum y eliminarlo conserva las fotos',async()=>{
  const album=(await change('post','/collections/albums',{name:'Vacío'}).expect(201)).body;
  assert.equal((await get('/collections/albums')).body.length,0);
  const p=(await upload({album:'Vacío'}).expect(201)).body;assert.equal(p.albumId,album.id);
  await change('patch','/collections/albums/'+album.id,{name:'Viaje'},b).expect(404);
  await change('patch','/collections/albums/'+album.id,{name:'Viaje'}).expect(200);
  assert.equal((await get('/gallery/'+p.id)).body.album,'Viaje');
  await change('delete','/collections/albums/'+album.id,{},b).expect(404);
  await change('delete','/collections/albums/'+album.id).expect(200);
  const preserved=(await get('/gallery/'+p.id).expect(200)).body;assert.equal(preserved.album,'');assert.equal(preserved.albumId,null);
  await get('/gallery/'+p.id+'/file/original').expect(200);
});

test('Recuerdo diario es el mismo para ambos, persiste y no se reemplaza si se elimina la foto elegida',async()=>{
  assert.equal((await get('/collections/memory')).body.photo,null);
  const p=(await upload().expect(201)).body;
  const first=(await get('/collections/memory',a)).body;assert.equal(first.photo.id,p.id);assert.equal(first.photo.passwordHash,undefined);
  assert.match(first.day,/^\d{4}-\d{2}-\d{2}$/);await upload().expect(201);
  assert.equal((await get('/collections/memory',b)).body.photo.id,p.id);
  await change('delete','/gallery/'+p.id).expect(200);
  for(const cookie of [a,b])assert.equal((await get('/collections/memory',cookie)).body.photo,null);
});

test('Recuerdo diario excluye fechas futuras y contraseñas sin permiso incluso para el creador',async()=>{
  await upload({unlockAt:Date.now()+3600000}).expect(201);
  const secret=(await upload({password:'test'}).expect(201)).body;
  for(const cookie of [a,b])assert.equal((await get('/collections/memory',cookie)).body.photo,null);
  await unlock(secret.id).expect(201);
  for(const cookie of [a,b])assert.equal((await get('/collections/memory',cookie)).body.photo.id,secret.id);
});

test('Avatar se comparte solo con sesión, reemplazarlo revoca el anterior y el trabajador limpia sus archivos',async()=>{
  const profile=(await assetUpload('/profile/avatar').expect(201)).body;assert.ok(profile.avatarId);assert.deepEqual((await readdir(join(dir,'assets',profile.avatarId))).sort(),['medium.webp','thumb.webp']);
  const publicProfiles=(await request(app.getHttpServer()).get('/api/auth/profiles').expect(200)).body;
  assert.equal(JSON.stringify(publicProfiles).includes(profile.avatarId),false);
  assert.ok((await get('/profiles')).body.some((u:any)=>u.avatarId===profile.avatarId));
  await request(app.getHttpServer()).get('/api/assets/'+profile.avatarId).expect(401);
  for(const cookie of [a,b]){const r=await get('/assets/'+profile.avatarId,cookie).expect(200);assert.equal((await sharp(r.body).metadata()).exif,undefined);assert.match(r.headers['cache-control'],/no-store/);}
  await get('/gallery/'+profile.avatarId+'/file/original').expect(404);
  const next=(await assetUpload('/profile/avatar').expect(201)).body;await get('/assets/'+profile.avatarId).expect(404);
  await app.get(AssetsService).maintain();assert.equal((await readdir(join(dir,'assets'))).includes(profile.avatarId),false);
  await change('delete','/profile/avatar').expect(200);await get('/assets/'+next.avatarId).expect(404);
  assert.equal((await get('/profiles',a)).body.find((u:any)=>u.id===ownerId).avatarId,null);
});

test('Wishlist y Algún día son listas distintas; ambos editan y completan, solo el creador elimina',async()=>{
  const w=(await change('post','/wishes',{kind:'experience',title:'Visitar el mar'}).expect(201)).body;
  await change('post','/wishes',{kind:'purchase',title:'Una cámara',priceCents:125050,currency:'CRC'}).expect(201);
  assert.equal((await get('/wishes?kind=experience')).body.items[0].id,w.id);
  assert.equal((await get('/wishes?kind=purchase')).body.total,1);
  const updated=(await change('patch','/wishes/'+w.id,{...wishFields(w),completed:true},b).expect(200)).body;
  assert.equal(updated.revision,2);assert.equal((await get('/wishes?kind=experience')).body.total,0);
  assert.equal((await get('/wishes?kind=experience&completed=true')).body.items[0].id,w.id);
  await change('patch','/wishes/'+w.id,{...wishFields(w),title:'Cambio antiguo'}).expect(409);
  assert.equal(await db.getRepository(Notification).countBy({userId:ownerId,kind:'wish',resourceId:w.id}),1);
  await change('delete','/wishes/'+w.id,{},b).expect(404);
  await change('delete','/wishes/'+w.id).expect(200);await get('/wishes/'+w.id).expect(404);
  assert.equal(await db.getRepository(Notification).countBy({resourceId:w.id}),0);
});

test('Listas rechazan enlaces ejecutables, precios inválidos y asociaciones a fotos privadas de la galería',async()=>{
  for(const extra of [{url:'javascript:alert(1)'},{url:'https://user:secret@example.test'},{priceCents:-1},{priceCents:1.5},{assetId:randomUUID()},{ownerId:peerId}])await change('post','/wishes',{kind:'purchase',title:'Una idea',...extra}).expect(400);
  const p=(await upload({password:'test'}).expect(201)).body;
  await get('/assets/'+p.id).expect(404);
  const w=(await change('post','/wishes',{kind:'purchase',title:'Un regalo',url:'https://example.test/item'}).expect(201)).body;
  await change('patch','/wishes/'+w.id,{...wishFields(w),assetId:p.id}).expect(400);
  await request(app.getHttpServer()).post('/api/wishes').set('Cookie',a).set('Origin','https://other.example').send({kind:'purchase',title:'No'}).expect(403);
});

test('Imagen de una idea es privada para ambos; reemplazar o borrar revoca inmediatamente y permite limpiar archivos',async()=>{
  let w=(await change('post','/wishes',{kind:'purchase',title:'Un libro'}).expect(201)).body;
  w=(await assetUpload('/wishes/'+w.id+'/photo',b).expect(201)).body;const old=w.assetId;
  await request(app.getHttpServer()).get('/api/assets/'+old).expect(401);
  for(const cookie of [a,b])await get('/assets/'+old,cookie).expect(200);
  const newer=(await assetUpload('/wishes/'+w.id+'/photo').expect(201)).body;
  await get('/assets/'+old).expect(404);assert.equal(newer.revision,w.revision+1);
  await change('delete','/wishes/'+w.id+'/photo',{},b).expect(200);await get('/assets/'+newer.assetId).expect(404);
  w=(await assetUpload('/wishes/'+w.id+'/photo').expect(201)).body;
  await change('delete','/wishes/'+w.id).expect(200);await get('/assets/'+w.assetId).expect(404);
  await app.get(AssetsService).maintain();assert.deepEqual(await readdir(join(dir,'assets')),[]);
});

test('La migración 0.5.0 reanuda y convierte etiquetas antiguas de álbum sin alterar el contenido o las contraseñas',async()=>{
  const p=(await upload({password:'test',album:'Archivo antiguo',description:'Conservar'}).expect(201)).body;
  await db.query('UPDATE photos SET albumId = NULL WHERE id = ?',[p.id]);await db.query('DELETE FROM albums');
  const before=(await db.query('SELECT passwordHash,description,album FROM photos WHERE id = ?',[p.id]))[0];
  const users=await db.query('SELECT * FROM users');const runner=db.createQueryRunner();const migration=new Finishing1791440000000();
  await migration.up(runner);await migration.up(runner);
  assert.deepEqual((await db.query('SELECT passwordHash,description,album FROM photos WHERE id = ?',[p.id]))[0],before);
  assert.deepEqual(await db.query('SELECT * FROM users'),users);
  const rows=await db.query('SELECT a.name FROM photos p JOIN albums a ON a.id = p.albumId WHERE p.id = ?',[p.id]);assert.equal(rows[0].name,'Archivo antiguo');
  assert.equal((await db.query('SELECT * FROM albums')).length,1);await runner.release();
});

test('Avatares y galería comparten el mismo límite de procesamiento',async()=>{
  const storage=app.get(PhotoStorage),original=storage.prepare.bind(storage);let release!:()=>void,started!:()=>void;
  const hold=new Promise<void>(r=>{release=r;}),began=new Promise<void>(r=>{started=r;});
  storage.prepare=async(id,buffer)=>{started();await hold;return original(id,buffer);};const first=upload().then(r=>r);await began;
  try{await assetUpload('/profile/avatar').expect(429);}finally{release();}
  assert.equal((await first).status,201);storage.prepare=original;await assetUpload('/profile/avatar').expect(201);
});

test('Actualización desde el esquema real 0.4.0 conserva usuarios y fotos existentes al agregar columnas y relaciones',async()=>{
  const old=await new DataSource({type:'sqljs',entities,migrations:migrations.slice(0,4),synchronize:false}).initialize();
  try{
    await old.runMigrations();
    for(const [id,slug] of [[ownerId,'ronaldo'],[peerId,'scarlet']])await old.query('INSERT INTO users (id,slug,name,email,passwordHash,mustChangePassword,accent,failedLogins,lockedUntil,createdAt) VALUES (?,?,?,?,?,0,?,0,0,1)',[id,slug,slug,slug+'@example.test','preserve-hash','sage']);
    const p=(await upload({album:'Viaje anterior',password:'test',description:'Mi foto'}).expect(201)).body;
    const source=(await db.query('SELECT * FROM photos WHERE id = ?',[p.id]))[0];delete source.albumId;
    const keys=Object.keys(source);await old.query(`INSERT INTO photos (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,keys.map(k=>source[k]));
    // Execute the incremental migration through TypeORM, including its SQL.js
    // beforeMigration/afterMigration hooks around table rebuilds.
    old.migrations.push(new Finishing1791440000000());await old.runMigrations({transaction:'each'});
    const runner=old.createQueryRunner();
    const migrated=await old.getRepository(Photo).findOneByOrFail({id:p.id});assert.equal(migrated.description,'Mi foto');assert.equal(migrated.passwordHash,source.passwordHash);assert.ok(migrated.albumId);
    assert.equal((await old.getRepository(User).findOneByOrFail({id:ownerId})).avatarId,null);
    assert.equal((await old.getRepository(User).findOneByOrFail({id:peerId})).passwordHash,'preserve-hash');
    await new Finishing1791440000000().up(runner);assert.equal((await old.query('SELECT * FROM albums')).length,1);await runner.release();
  }finally{await old.destroy();}
});
