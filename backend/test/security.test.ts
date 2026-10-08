import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Message,Petition } from '../src/together/entities';
import { MessagesWorker } from '../src/together/messages-worker';
import { beforeEach,afterEach,test } from 'node:test';
import assert from 'node:assert/strict';
import { NestFactory } from '@nestjs/core';
import { INestApplication,ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';
import { Config } from '../src/common/config';
import { entities,User,PasswordReset,Session,CounterChange,Notification,Task,AuthThrottle } from '../src/database/entities';
import { migrations } from '../src/database/data-source';
import { seed,resetUser } from '../src/cli/manage';
import { MailService } from '../src/mail/mail.service';
import { NotificationWorker } from '../src/notifications/notification-worker';
import { CalendarEvent,MailJob,Reminder } from '../src/agenda/entities';
import { AgendaWorker } from '../src/agenda/agenda-worker';
import { MailWorker } from '../src/mail/mail-worker';

const initial='test-initial-password-123';const next='test-replacement-password-456';
const config:Config={NODE_ENV:'test',PORT:3000,HOST:'127.0.0.1',WEB_ORIGIN:'http://localhost:5173',COOKIE_SECURE:false,DB_HOST:'localhost',DB_PORT:3306,DB_USERNAME:'test',DB_PASSWORD:'test',DB_DATABASE:'test',AUTH_SECRET:'only-tests-123456789012345678901234567890',RONALDO_EMAIL:'ronaldo@example.test',SCARLET_EMAIL:'scarlet@example.test',MAIL_USER:'test',MAIL_APP_PASSWORD:'test',MAIL_FROM:'test'};
let db:DataSource,app:INestApplication,code:string,mailFails:boolean;
beforeEach(async()=>{
  db=await new DataSource({type:'sqljs',entities,migrations,synchronize:false,logging:false}).initialize();await db.runMigrations();
  process.env.RONALDO_INITIAL_PASSWORD=initial;process.env.SCARLET_INITIAL_PASSWORD=initial;await seed(db,config);
  for(const u of await db.getRepository(User).find())await db.getRepository(User).update(u.id,{mustChangePassword:false});
  code='';mailFails=false;
  const mail={available:()=>true,sendReset:async(_to:string,c:string)=>{if(mailFails)throw new ServiceUnavailableException('SMTP unavailable');code=c;}} as unknown as MailService;
  app=await NestFactory.create(AppModule.register(config,db,mail,false),{logger:false});app.setGlobalPrefix('api');app.use(cookieParser());await app.init();
});
afterEach(async()=>{await app.close();if(db.isInitialized)await db.destroy();});
function post(path:string,cookie?:string){const r=request(app.getHttpServer()).post('/api'+path).set('Origin',config.WEB_ORIGIN);return cookie?r.set('Cookie',cookie):r;}
async function login(slug='ronaldo',password=initial){const r=await post('/auth/login').send({slug,password}).expect(201);const cookies=r.headers['set-cookie'] as unknown as string[];return {cookie:cookies[0].split(';')[0],body:r.body,header:cookies[0]};}
async function recovery(){await post('/auth/recovery').send({slug:'ronaldo'}).expect(201);assert.match(code,/^\d{6}$/);return code;}
async function task(cookie:string,title='Terminar documento',priority=2,dueAt:number|null=null){return (await post('/tasks',cookie).send({title,priority,dueAt}).expect(201)).body;}

test('Login real emite cookie HttpOnly, conserva hashes y no revela correos en perfiles públicos',async()=>{
  const r=await login();assert.match(r.header,/HttpOnly/);assert.match(r.header,/SameSite=Strict/);assert.match(r.header,/Path=\/api/);assert.equal(r.body.passwordHash,undefined);
  const profiles=await request(app.getHttpServer()).get('/api/auth/profiles').expect(200);assert.equal(profiles.body.length,2);assert.equal(profiles.body[0].email,undefined);
  assert.notEqual((await db.getRepository(User).findOneByOrFail({slug:'ronaldo'})).passwordHash,initial);
});
test('La API exige sesión y rechaza mutaciones desde otro origen',async()=>{
  await request(app.getHttpServer()).get('/api/tasks').expect(401);const {cookie}=await login();
  await request(app.getHttpServer()).post('/api/tasks').set('Cookie',cookie).set('Origin','https://otro.example').send({title:'x',priority:2}).expect(403);
  await request(app.getHttpServer()).post('/api/tasks').set('Cookie',cookie).send({title:'x',priority:2}).expect(403);
});
test('Cada usuario solo consulta, cambia y elimina sus tareas',async()=>{
  const a=await login(),b=await login('scarlet');const t=await task(a.cookie);
  const own=await request(app.getHttpServer()).get('/api/tasks').set('Cookie',a.cookie).expect(200);assert.equal(own.body.total,1);
  const other=await request(app.getHttpServer()).get('/api/tasks').set('Cookie',b.cookie).expect(200);assert.equal(other.body.total,0);
  await request(app.getHttpServer()).patch('/api/tasks/'+t.id).set('Origin',config.WEB_ORIGIN).set('Cookie',b.cookie).send({title:'hack'}).expect(404);
  await request(app.getHttpServer()).delete('/api/tasks/'+t.id).set('Origin',config.WEB_ORIGIN).set('Cookie',b.cookie).expect(404);
  await request(app.getHttpServer()).get('/api/tasks?ownerId='+a.body.id).set('Cookie',b.cookie).expect(400);
  assert.equal((await db.getRepository(Task).findOneByOrFail({id:t.id})).title,'Terminar documento');
});
test('Las tareas se ordenan por vencidas, prioridad y fecha; las sin fecha van al final de su prioridad',async()=>{
  const {cookie}=await login();const now=Date.now();await task(cookie,'Sin fecha alta',3);await task(cookie,'Baja vencida',1,now-60000);await task(cookie,'Alta después',3,now+7200000);await task(cookie,'Alta pronto',3,now+3600000);await task(cookie,'Media pronto',2,now+100000);
  const r=await request(app.getHttpServer()).get('/api/tasks?limit=3').set('Cookie',cookie).expect(200);assert.deepEqual(r.body.items.map((t:Task)=>t.title),['Baja vencida','Alta pronto','Alta después']);assert.equal(r.body.total,5);
  const p2=await request(app.getHttpServer()).get('/api/tasks?limit=3&page=2').set('Cookie',cookie).expect(200);assert.deepEqual(p2.body.items.map((t:Task)=>t.title),['Sin fecha alta','Media pronto']);
});
test('Validación rechaza asignación de propietario y prioridades inválidas',async()=>{
  const {cookie}=await login();await post('/tasks',cookie).send({title:'x',priority:2,ownerId:'scarlet'}).expect(400);await post('/tasks',cookie).send({title:'  ',priority:4}).expect(400);
});
test('Solo el creador cambia el contador, historial exacto y sin valores negativos',async()=>{
  const a=await login(),b=await login('scarlet');const c=(await post('/counters',a.cookie).send({label:'Veces que me hiciste reír',emoji:'😂'}).expect(201)).body;
  await post(`/counters/${c.id}/change`,b.cookie).send({delta:1}).expect(404);
  await post(`/counters/${c.id}/change`,a.cookie).send({delta:-1}).expect(400);
  await post(`/counters/${c.id}/change`,a.cookie).send({delta:1}).expect(201);
  await post(`/counters/${c.id}/change`,a.cookie).send({delta:4}).expect(400);
  const history=await request(app.getHttpServer()).get(`/api/counters/${c.id}/history`).set('Cookie',b.cookie).expect(200);assert.equal(history.body.total,1);assert.equal(history.body.items[0].valueAfter,1);
  await request(app.getHttpServer()).delete('/api/counters/'+c.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).expect(200);assert.equal(await db.getRepository(CounterChange).count(),0);
});
test('Notificaciones internas aisladas por destinatario y sin estados de mensaje',async()=>{
  const a=await login(),b=await login('scarlet');await post('/counters',a.cookie).send({label:'Risas',emoji:'😂'}).expect(201);
  const theirs=await request(app.getHttpServer()).get('/api/notifications').set('Cookie',b.cookie).expect(200);assert.equal(theirs.body.total,1);
  const mine=await request(app.getHttpServer()).get('/api/notifications').set('Cookie',a.cookie).expect(200);assert.equal(mine.body.total,0);
  await post(`/notifications/${theirs.body.items[0].id}/dismiss`,a.cookie).expect(404);
  await post(`/notifications/${theirs.body.items[0].id}/dismiss`,b.cookie).expect(201);
  assert.equal((await request(app.getHttpServer()).get('/api/notifications').set('Cookie',b.cookie)).body.total,0);
});
test('Notificación de vencimiento se genera una sola vez y se limpia al completar la tarea',async()=>{
  const a=await login();const t=await task(a.cookie,'Vencida',1,Date.now()-10000);const worker=new NotificationWorker(db);await worker.tick();await worker.tick();assert.equal(await db.getRepository(Notification).count(),1);
  await request(app.getHttpServer()).patch('/api/tasks/'+t.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({completed:true}).expect(200);assert.equal(await db.getRepository(Notification).count(),0);
});
test('Primer ingreso obliga a cambiar contraseña; seed es idempotente',async()=>{
  const u=await db.getRepository(User).findOneByOrFail({slug:'ronaldo'});await db.getRepository(User).update(u.id,{mustChangePassword:true});
  const a=await login();assert.equal(a.body.mustChangePassword,true);await request(app.getHttpServer()).get('/api/tasks').set('Cookie',a.cookie).expect(403);
  await post('/auth/password',a.cookie).send({currentPassword:initial,newPassword:next}).expect(201);
  await request(app.getHttpServer()).get('/api/auth/me').set('Cookie',a.cookie).expect(401);
  await seed(db,config);const updated=await login('ronaldo',next);assert.equal(updated.body.mustChangePassword,false);assert.equal(await db.getRepository(User).count(),2);
});
test('Cerrar sesión revoca la cookie en servidor',async()=>{const a=await login();await post('/auth/logout',a.cookie).expect(201);await request(app.getHttpServer()).get('/api/auth/me').set('Cookie',a.cookie).expect(401);});
test('Código de recuperación no se guarda en claro, es de un uso e invalida todas las sesiones',async()=>{
  const a=await login(),second=await login();const c=await recovery();const stored=await db.getRepository(PasswordReset).find();assert.notEqual(stored[0].codeHash,c);
  await post('/auth/reset').send({slug:'ronaldo',code:c,newPassword:next}).expect(201);
  await request(app.getHttpServer()).get('/api/auth/me').set('Cookie',a.cookie).expect(401);await request(app.getHttpServer()).get('/api/auth/me').set('Cookie',second.cookie).expect(401);
  await post('/auth/reset').send({slug:'ronaldo',code:c,newPassword:initial}).expect(400);await login('ronaldo',next);
});
test('Cinco códigos incorrectos agotan el intento, incluso si luego se usa el correcto',async()=>{
  const c=await recovery();const wrong=c==='000000'?'000001':'000000';for(let i=0;i<5;i++)await post('/auth/reset').send({slug:'ronaldo',code:wrong,newPassword:next}).expect(400);
  await post('/auth/reset').send({slug:'ronaldo',code:c,newPassword:next}).expect(400);assert.equal((await db.getRepository(PasswordReset).find())[0].attempts,5);
});
test('No acepta códigos vencidos',async()=>{const c=await recovery();const r=(await db.getRepository(PasswordReset).find())[0];r.expiresAt=Date.now()-1;await db.getRepository(PasswordReset).save(r);await post('/auth/reset').send({slug:'ronaldo',code:c,newPassword:next}).expect(400);});
test('Fallo SMTP no deja un código activo ni altera la contraseña',async()=>{mailFails=true;await post('/auth/recovery').send({slug:'ronaldo'}).expect(503);assert.equal(await db.getRepository(PasswordReset).count(),0);await login();});
test('Script de emergencia revoca sesiones y exige cambiar contraseña',async()=>{const a=await login();const temporary=await resetUser(db,'ronaldo');assert.ok(temporary.length>=12);await request(app.getHttpServer()).get('/api/auth/me').set('Cookie',a.cookie).expect(401);const b=await login('ronaldo',temporary);assert.equal(b.body.mustChangePassword,true);});
test('Cinco contraseñas incorrectas bloquean temporalmente la cuenta',async()=>{for(let i=0;i<5;i++)await post('/auth/login').send({slug:'ronaldo',password:'incorrecta'}).expect(401);await post('/auth/login').send({slug:'ronaldo',password:initial}).expect(401);assert.ok((await db.getRepository(User).findOneByOrFail({slug:'ronaldo'})).lockedUntil>Date.now());});
test('La expiración de sesión impide el acceso y existe límite persistente de recuperación',async()=>{
  const a=await login();const s=(await db.getRepository(Session).find())[0];s.expiresAt=Date.now()-1;await db.getRepository(Session).save(s);await request(app.getHttpServer()).get('/api/tasks').set('Cookie',a.cookie).expect(401);
  await recovery();await post('/auth/recovery').send({slug:'ronaldo'}).expect(429);assert.ok(await db.getRepository(AuthThrottle).count()>0);
});
test('El perfil no permite reemplazar correo ni contraseña mediante asignación masiva',async()=>{const a=await login();await request(app.getHttpServer()).patch('/api/profile').set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({name:'X',accent:'sage',email:'evil@example.test'}).expect(400);});

test('Acepta contraseña de 4 caracteres al cambiar y recuperar; rechaza 3',async()=>{
  const a=await login();await post('/auth/password',a.cookie).send({currentPassword:initial,newPassword:'abc'}).expect(400);
  await post('/auth/password',a.cookie).send({currentPassword:initial,newPassword:'abcd'}).expect(201);await login('ronaldo','abcd');
  const c=await recovery();await post('/auth/reset').send({slug:'ronaldo',code:c,newPassword:'xy12'}).expect(201);await login('ronaldo','xy12');
});

test('Agenda privada: expansión de repeticiones y protección de edición/borrado',async()=>{
  const a=await login(),b=await login('scarlet');const start=Date.parse('2030-01-31T09:00:00-06:00');
  const body={title:'Evento de prueba',startsAt:start,endsAt:start+3600000,recurrence:'monthly',alertMinutes:15};
  const created=(await post('/agenda',a.cookie).send(body).expect(201)).body;
  const range=`?from=${Date.parse('2030-02-01T00:00:00-06:00')}&to=${Date.parse('2030-03-01T00:00:00-06:00')}`;
  const mine=await request(app.getHttpServer()).get('/api/agenda'+range).set('Cookie',a.cookie).expect(200);assert.equal(mine.body.items.length,1);assert.equal(mine.body.items[0].occurrenceAt,Date.parse('2030-02-28T09:00:00-06:00'));
  const other=await request(app.getHttpServer()).get('/api/agenda'+range).set('Cookie',b.cookie).expect(200);assert.equal(other.body.items.length,0);
  await request(app.getHttpServer()).patch('/api/agenda/'+created.id).set('Origin',config.WEB_ORIGIN).set('Cookie',b.cookie).send(body).expect(404);
  await request(app.getHttpServer()).delete('/api/agenda/'+created.id).set('Origin',config.WEB_ORIGIN).set('Cookie',b.cookie).expect(404);
  await post('/agenda',a.cookie).send({...body,endsAt:start-1}).expect(400);
});

test('Avisos de agenda son únicos y no se reinician al editar solo el texto',async()=>{
  const a=await login();const startsAt=Date.now()+60000;const body={title:'Evento',startsAt,endsAt:startsAt+3600000,recurrence:'daily',alertMinutes:15,email:true};
  const e=(await post('/agenda',a.cookie).send(body).expect(201)).body;const worker=new AgendaWorker(db);await worker.tick();await worker.tick();
  assert.equal(await db.getRepository(Notification).countBy({resourceId:e.id}),1);assert.equal(await db.getRepository(MailJob).countBy({resourceId:e.id}),1);
  const first=(await db.getRepository(CalendarEvent).findOneByOrFail({id:e.id})).nextAlertAt;
  await request(app.getHttpServer()).patch('/api/agenda/'+e.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({...body,title:'Título corregido'}).expect(200);await worker.tick();
  assert.equal((await db.getRepository(CalendarEvent).findOneByOrFail({id:e.id})).nextAlertAt,first);assert.equal(await db.getRepository(MailJob).countBy({resourceId:e.id}),1);
});

test('Completar tarea recurrente dos veces genera una sola siguiente tarea, conservando el ancla mensual',async()=>{
  const a=await login();const dueAt=Date.parse('2035-01-31T10:00:00-06:00');
  const t=(await post('/tasks',a.cookie).send({title:'Mensual',priority:2,dueAt,recurrence:'monthly'}).expect(201)).body;
  const finish=()=>request(app.getHttpServer()).patch('/api/tasks/'+t.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({completed:true});
  await finish().expect(200);await finish().expect(200);assert.equal(await db.getRepository(Task).count(),2);
  const next=await db.getRepository(Task).findOneByOrFail({completed:false});assert.equal(next.dueAt,Date.parse('2035-02-28T10:00:00-06:00'));assert.equal(next.recurrenceAnchor,dueAt);
  await request(app.getHttpServer()).patch('/api/tasks/'+next.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({completed:true}).expect(200);
  const march=await db.getRepository(Task).findOneByOrFail({completed:false});assert.equal(march.dueAt,Date.parse('2035-03-31T10:00:00-06:00'));
  await request(app.getHttpServer()).patch('/api/tasks/'+t.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({completed:false}).expect(400);
});

test('Recordatorios personales no se entregan al otro; solo el destinatario completa los compartidos',async()=>{
  const a=await login(),b=await login('scarlet');const personal=(await post('/reminders',a.cookie).send({title:'Personal',target:'self',remindAt:Date.now()}).expect(201)).body;
  const shared=(await post('/reminders',a.cookie).send({title:'Para la otra persona',target:'other',remindAt:Date.now(),email:true}).expect(201)).body;
  const worker=new AgendaWorker(db);await worker.tick();await worker.tick();
  const list=await request(app.getHttpServer()).get('/api/reminders').set('Cookie',b.cookie).expect(200);assert.equal(list.body.total,1);assert.equal(list.body.items[0].id,shared.id);
  assert.equal(await db.getRepository(Notification).countBy({resourceId:personal.id}),1);assert.equal(await db.getRepository(Notification).countBy({resourceId:shared.id}),1);
  await post('/reminders/'+shared.id+'/complete',a.cookie).expect(404);await post('/reminders/'+shared.id+'/complete',b.cookie).expect(201);
  assert.equal(await db.getRepository(MailJob).countBy({resourceId:shared.id}),0);
  await request(app.getHttpServer()).delete('/api/reminders/'+shared.id).set('Origin',config.WEB_ORIGIN).set('Cookie',b.cookie).expect(404);
});

test('Correo en cola se reintenta con la misma identidad y no afecta la notificación interna',async()=>{
  const a=await login();const t=await task(a.cookie,'Aviso por correo',2,Date.now()-1000);
  await db.getRepository(Task).update(t.id,{email:true});await new NotificationWorker(db).tick();const mail=app.get(MailService);
  let calls=0;mail.sendNotice=async()=>{calls++;if(calls===1)throw new Error('fallo simulado');};const worker=new MailWorker(db,mail);await worker.tick();
  const job=await db.getRepository(MailJob).findOneByOrFail({resourceId:t.id});assert.equal(job.status,'pending');assert.equal(job.attempts,1);assert.equal(await db.getRepository(Notification).countBy({resourceId:t.id}),1);
  job.nextAttemptAt=Date.now()-1;await db.getRepository(MailJob).save(job);await worker.tick();assert.equal((await db.getRepository(MailJob).findOneByOrFail({id:job.id})).status,'sent');await worker.tick();assert.equal(calls,2);
});

test('Trabajo de correo abandonado se recupera al vencer su reserva; tarea eliminada no se envía',async()=>{
  const a=await login();const t=await task(a.cookie,'Recuperar cola',2,Date.now()-1000);await db.getRepository(Task).update(t.id,{email:true});await new NotificationWorker(db).tick();
  const job=await db.getRepository(MailJob).findOneByOrFail({resourceId:t.id});job.status='sending';job.lockedUntil=Date.now()-1;job.leaseToken='expired';await db.getRepository(MailJob).save(job);
  const mail=app.get(MailService);let sent=0;mail.sendNotice=async()=>{sent++;};await new MailWorker(db,mail).tick();assert.equal(sent,1);
  const other=await task(a.cookie,'No enviar',2,Date.now()-1000);await db.getRepository(Task).update(other.id,{email:true});await new NotificationWorker(db).tick();await db.getRepository(Task).delete(other.id);await new MailWorker(db,mail).tick();assert.equal(sent,1);assert.equal((await db.getRepository(MailJob).findOneByOrFail({resourceId:other.id})).status,'cancelled');
});

test('Cinco fallos de correo detienen reintentos y crean un aviso interno, sin repetirlo',async()=>{
  const a=await login();const t=await task(a.cookie,'Agotar cola',2,Date.now()-1000);await db.getRepository(Task).update(t.id,{email:true});await new NotificationWorker(db).tick();const mail=app.get(MailService);mail.sendNotice=async()=>{throw new Error('fallo');};const worker=new MailWorker(db,mail);
  for(let i=0;i<5;i++){const j=await db.getRepository(MailJob).findOneByOrFail({resourceId:t.id});j.nextAttemptAt=Date.now()-1;await db.getRepository(MailJob).save(j);await worker.tick();}
  assert.equal((await db.getRepository(MailJob).findOneByOrFail({resourceId:t.id})).status,'failed');assert.equal(await db.getRepository(Notification).countBy({kind:'mail'}),1);await worker.tick();assert.equal(await db.getRepository(Notification).countBy({kind:'mail'}),1);
});

test('PATCH de una tarea conserva notas, fecha, recurrencia y correo cuando se omiten',async()=>{
  const a=await login();const dueAt=Date.now()+86400000;const original=(await post('/tasks',a.cookie).send({title:'Conservar campos',notes:'Nota intacta',priority:2,dueAt,recurrence:'weekly',email:true}).expect(201)).body;
  const result=await request(app.getHttpServer()).patch('/api/tasks/'+original.id).set('Origin',config.WEB_ORIGIN).set('Cookie',a.cookie).send({priority:3}).expect(200);
  assert.equal(result.body.notes,'Nota intacta');assert.equal(result.body.dueAt,dueAt);assert.equal(result.body.recurrence,'weekly');assert.equal(result.body.email,true);
});

test('Mensajes inmediatos: acceso de ambos perfiles, un aviso interno y ninguna señal de lectura',async()=>{
  const a=await login(),b=await login('scarlet');const m=(await post('/messages',a.cookie).send({body:'Un mensaje para ti'}).expect(201)).body;
  assert.equal(m.scheduled,false);assert.equal(m.targetId,b.body.id);
  for(const cookie of [a.cookie,b.cookie]){
    const list=await request(app.getHttpServer()).get('/api/messages').set('Cookie',cookie).expect(200);assert.equal(list.body.total,1);assert.equal(list.body.items[0].body,'Un mensaje para ti');
    const detail=await request(app.getHttpServer()).get('/api/messages/'+m.id).set('Cookie',cookie).expect(200);
    assert.deepEqual(Object.keys(detail.body).sort(),['body','deliverAt','id','ownerId','scheduled','targetId']);
  }
  assert.equal(await db.getRepository(Notification).countBy({kind:'message',userId:b.body.id}),1);assert.equal(await db.getRepository(Notification).countBy({kind:'message',userId:a.body.id}),0);
  assert.equal(await db.getRepository(MailJob).count(),0);
});

test('El destinatario no puede consultar, editar, cancelar ni borrar un mensaje futuro ni descubrirlo en listados',async()=>{
  const a=await login(),b=await login('scarlet');const m=(await post('/messages',a.cookie).send({body:'Todavía no',deliverAt:Date.now()+86400000}).expect(201)).body;
  assert.equal((await request(app.getHttpServer()).get('/api/messages?view=scheduled').set('Cookie',a.cookie)).body.total,1);
  for(const path of ['/messages','/messages?view=scheduled','/notifications'])assert.equal((await request(app.getHttpServer()).get('/api'+path).set('Cookie',b.cookie).expect(200)).body.total,0);
  await request(app.getHttpServer()).get('/api/messages/'+m.id).set('Cookie',b.cookie).expect(404);
  await request(app.getHttpServer()).patch('/api/messages/'+m.id).set('Cookie',b.cookie).set('Origin',config.WEB_ORIGIN).send({body:'Cambiar',deliverAt:Date.now()+10000}).expect(404);
  await post('/messages/'+m.id+'/cancel',b.cookie).expect(404);
  await request(app.getHttpServer()).delete('/api/messages/'+m.id).set('Cookie',b.cookie).set('Origin',config.WEB_ORIGIN).expect(404);
});

test('Entrega programada se recupera tras reiniciar y publica un solo aviso; después impide edición y cancelación',async()=>{
  const a=await login(),b=await login('scarlet');const m=(await post('/messages',a.cookie).send({body:'Para después',deliverAt:Date.now()+60000}).expect(201)).body;
  await new MessagesWorker(db).tick();assert.equal(await db.getRepository(Notification).countBy({resourceId:m.id}),0);
  await db.getRepository(Message).update(m.id,{deliverAt:Date.now()-60000});
  // Time passing alone must not leak a queued message before the atomic release.
  await request(app.getHttpServer()).get('/api/messages/'+m.id).set('Cookie',b.cookie).expect(404);
  await new MessagesWorker(db).tick();await new MessagesWorker(db).tick();
  const received=await request(app.getHttpServer()).get('/api/messages/'+m.id).set('Cookie',b.cookie).expect(200);assert.equal(received.body.body,'Para después');assert.equal(received.body.scheduled,false);
  assert.equal(await db.getRepository(Notification).countBy({resourceId:m.id}),1);
  await post('/messages/'+m.id+'/cancel',a.cookie).expect(409);
  await request(app.getHttpServer()).patch('/api/messages/'+m.id).set('Cookie',a.cookie).set('Origin',config.WEB_ORIGIN).send({body:'Cambio tardío',deliverAt:Date.now()+60000}).expect(409);
});

test('El creador puede reprogramar o cancelar; un mensaje cancelado no reaparece al procesar la cola',async()=>{
  const a=await login();const m=(await post('/messages',a.cookie).send({body:'Original',deliverAt:Date.now()+3600000}).expect(201)).body;
  const deliverAt=Date.now()+7200000;const updated=await request(app.getHttpServer()).patch('/api/messages/'+m.id).set('Cookie',a.cookie).set('Origin',config.WEB_ORIGIN).send({body:'Corregido',deliverAt}).expect(200);assert.equal(updated.body.body,'Corregido');assert.equal(updated.body.deliverAt,deliverAt);
  await post('/messages/'+m.id+'/cancel',a.cookie).expect(201);await new MessagesWorker(db).tick();
  assert.equal(await db.getRepository(Message).count(),0);assert.equal(await db.getRepository(Notification).countBy({resourceId:m.id}),0);
});

test('Eliminar un mensaje es independiente por persona y la segunda eliminación purga su contenido y avisos',async()=>{
  const a=await login(),b=await login('scarlet');const m=(await post('/messages',a.cookie).send({body:'Cada quien conserva su copia'}).expect(201)).body;
  const remove=(cookie:string)=>request(app.getHttpServer()).delete('/api/messages/'+m.id).set('Cookie',cookie).set('Origin',config.WEB_ORIGIN);
  await remove(b.cookie).expect(200);assert.equal(await db.getRepository(Notification).countBy({resourceId:m.id}),0);
  await request(app.getHttpServer()).get('/api/messages/'+m.id).set('Cookie',b.cookie).expect(404);
  const mine=await request(app.getHttpServer()).get('/api/messages/'+m.id).set('Cookie',a.cookie).expect(200);assert.equal(mine.body.targetHidden,undefined);
  assert.equal((await request(app.getHttpServer()).get('/api/messages').set('Cookie',b.cookie)).body.total,0);
  await remove(b.cookie).expect(200);await remove(a.cookie).expect(200);assert.equal(await db.getRepository(Message).count(),0);
});

test('Mensajes y peticiones exigen sesión, origen y campos válidos sin asignación masiva',async()=>{
  for(const path of ['/messages','/messages?view=scheduled','/petitions'])await request(app.getHttpServer()).get('/api'+path).expect(401);
  const a=await login();
  for(const body of [{body:'  '},{body:'x'.repeat(5001)},{body:'x',deliverAt:Date.now()-1000},{body:'x',targetId:a.body.id},{body:'x',releasedAt:1},{body:'x',category:'important'}])await post('/messages',a.cookie).send(body).expect(400);
  for(const [path,body] of [['/messages',{body:'x'}],['/petitions',{title:'x'}]] as const)await request(app.getHttpServer()).post('/api'+path).set('Cookie',a.cookie).set('Origin','https://other.example').send(body).expect(403);
  await post('/petitions',a.cookie).send({title:'x',status:'accepted'}).expect(400);await post('/petitions',a.cookie).send({title:'  '}).expect(400);
  await request(app.getHttpServer()).get('/api/messages?ownerId='+a.body.id).set('Cookie',a.cookie).expect(400);
});

test('Peticiones: solo el destinatario responde, puede cambiarla y repetir no duplica notificaciones',async()=>{
  const a=await login(),b=await login('scarlet');const p=(await post('/petitions',a.cookie).send({title:'¿Caminamos juntos?',details:'Al atardecer'}).expect(201)).body;assert.equal(p.status,'pending');
  assert.equal((await request(app.getHttpServer()).get('/api/petitions').set('Cookie',a.cookie)).body.total,0);
  assert.equal((await request(app.getHttpServer()).get('/api/petitions?view=mine').set('Cookie',a.cookie)).body.total,1);
  assert.equal((await request(app.getHttpServer()).get('/api/petitions').set('Cookie',b.cookie)).body.total,1);
  await post('/petitions/'+p.id+'/respond',a.cookie).send({status:'accepted'}).expect(404);
  for(const status of ['chance','maybe','accepted','rejected']){
    const result=await post('/petitions/'+p.id+'/respond',b.cookie).send({status,note:'Mi respuesta'}).expect(201);assert.equal(result.body.status,status);
    await post('/petitions/'+p.id+'/respond',b.cookie).send({status,note:'Mi respuesta'}).expect(201);
    assert.equal(await db.getRepository(Notification).countBy({resourceId:p.id,userId:a.body.id}),1);
  }
  assert.equal(await db.getRepository(Reminder).count(),0);assert.equal(await db.getRepository(MailJob).count(),0);
  await post('/petitions/'+p.id+'/respond',b.cookie).send({status:'pending'}).expect(400);
  const filtered=await request(app.getHttpServer()).get('/api/petitions?status=rejected').set('Cookie',b.cookie).expect(200);assert.equal(filtered.body.total,1);
});

test('El creador elimina una petición y su respuesta para ambos, limpiando las notificaciones',async()=>{
  const a=await login(),b=await login('scarlet');const p=(await post('/petitions',a.cookie).send({title:'Una petición'}).expect(201)).body;
  await post('/petitions/'+p.id+'/respond',b.cookie).send({status:'accepted'}).expect(201);
  await request(app.getHttpServer()).delete('/api/petitions/'+p.id).set('Cookie',b.cookie).set('Origin',config.WEB_ORIGIN).expect(404);
  await request(app.getHttpServer()).delete('/api/petitions/'+p.id).set('Cookie',a.cookie).set('Origin',config.WEB_ORIGIN).expect(200);
  await request(app.getHttpServer()).get('/api/petitions/'+p.id).set('Cookie',b.cookie).expect(404);assert.equal(await db.getRepository(Petition).count(),0);assert.equal(await db.getRepository(Notification).countBy({resourceId:p.id}),0);
});

test('Mensajes paginados mantienen orden estable sin incluir programados ni ocultos',async()=>{
  const a=await login(),b=await login('scarlet');const now=Date.now()-1000;
  const rows=Array.from({length:23},(_,i)=>({id:randomUUID(),ownerId:a.body.id,targetId:b.body.id,body:String(i),deliverAt:now+i,releasedAt:now,ownerHidden:false,targetHidden:false,createdAt:now}));
  rows[21].targetHidden=true;await db.getRepository(Message).save(rows);await db.getRepository(Message).update(rows[22].id,{releasedAt:null});
  const first=await request(app.getHttpServer()).get('/api/messages').set('Cookie',b.cookie).expect(200);const second=await request(app.getHttpServer()).get('/api/messages?page=2').set('Cookie',b.cookie).expect(200);
  assert.equal(first.body.total,21);assert.equal(first.body.items.length,20);assert.equal(second.body.items.length,1);assert.equal(first.body.items[0].body,'20');assert.equal(second.body.items[0].body,'0');
});
