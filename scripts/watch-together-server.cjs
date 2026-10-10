// Isolated SQL.js fixture. Never uses production configuration or persistent media.
require('reflect-metadata');
const {NestFactory}=require('@nestjs/core');
const {DataSource}=require('typeorm');
const cookieParser=require('cookie-parser');
const {AppModule}=require('../backend/dist/src/app.module');
const {entities,User}=require('../backend/dist/src/database/entities');
const {migrations}=require('../backend/dist/src/database/data-source');
const {seed}=require('../backend/dist/src/cli/manage');
const {VideosService}=require('../backend/dist/src/videos/videos.service');
const {Video}=require('../backend/dist/src/videos/entities');
const {randomUUID}=require('node:crypto');
(async()=>{
const path=require('node:path'),root=process.env.OURSPACE_QA_ROOT;if(!root)throw new Error('Run through scripts/test-watch-together.cjs');
const config={NODE_ENV:'test',PORT:3000,HOST:'127.0.0.1',WEB_ORIGIN:'http://127.0.0.1:5173',COOKIE_SECURE:false,DB_HOST:'localhost',DB_PORT:3306,DB_USERNAME:'test',DB_PASSWORD:'test',DB_DATABASE:'test',AUTH_SECRET:'qa-isolated-only-123456789012345678901234567890',RONALDO_EMAIL:'ronaldo@example.test',SCARLET_EMAIL:'scarlet@example.test',MAIL_USER:'',MAIL_APP_PASSWORD:'',MAIL_FROM:'',VIDEO_DELIVERY:'node',VIDEO_STORAGE_DIR:path.join(root,'videos'),PHOTO_STORAGE_DIR:path.join(root,'photos'),VIDEO_RESERVE_BYTES:0,WATCH_TOGETHER_ENABLED:'true'};
const db=await new DataSource({type:'sqljs',entities,migrations,synchronize:false}).initialize();await db.runMigrations();process.env.RONALDO_INITIAL_PASSWORD='abcd';process.env.SCARLET_INITIAL_PASSWORD='abcd';await seed(db,config);await db.getRepository(User).createQueryBuilder().update().set({mustChangePassword:false}).execute();
const app=await NestFactory.create(AppModule.register(config,db,{available:()=>false},false),{logger:false});app.setGlobalPrefix('api');app.use(cookieParser());await app.listen(3000,'127.0.0.1');const s=app.get(VideosService);const f=await s.createFolder({name:'Curso de Redes CCNA',description:'Un paso a la vez. Nuestras clases, en el orden que elegimos.'});await s.createFolder({name:'Tutoriales Linux',description:'Comandos y pequeños descubrimientos para volver a consultar.'});
const uid=(await db.getRepository(User).findOneByOrFail({slug:'ronaldo'})).id;await s.storage.init();const source=path.join(root,'video.mp4');
for(let i=0;i<3;i++){const id=randomUUID();require('node:fs').copyFileSync(source,s.storage.path(id,'mp4'));await db.getRepository(Video).save({id,folderId:f.id,title:['Introducción a las redes','Modelo OSI y comunicación entre dispositivos','Direccionamiento IPv4: ejercicios y práctica'][i],description:'Una clase para disfrutar y aprender a nuestro ritmo.',thumbnailId:null,position:i+1,duration:120,bytes:require('node:fs').statSync(source).size,sha256:randomUUID().replaceAll('-','').padEnd(64,'0'),createdAt:Date.now(),updatedAt:Date.now()});if(i===0)await s.progress(uid,id,1,false,false);}
console.log('QA ready');
})();
