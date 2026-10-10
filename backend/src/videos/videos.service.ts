import { Injectable,Inject,BadRequestException,ForbiddenException,NotFoundException,ConflictException,OnModuleDestroy,OnModuleInit,Logger } from '@nestjs/common';
import { DataSource,EntityManager,IsNull,LessThan } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { open,stat,rename,chmod,readdir,rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Readable } from 'node:stream';
import { CONFIG,Config } from '../common/config';
import { User } from '../database/entities';
import { locked } from '../database/data-source';
import { VideoCatalog,VideoFolder,Video,VideoProgress,VideoFavorite,VideoUpload } from './entities';
import { VideoStorage,CHUNK } from './storage';
@Injectable()
export class VideosService implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private cleaning=false;private finishing=new Set<string>();private logger=new Logger('Videos');
  constructor(private readonly db:DataSource,@Inject(CONFIG)readonly config:Config,readonly storage:VideoStorage){}
  onModuleInit(){if(this.config.NODE_ENV==='test')return;this.timer=setInterval(()=>void this.maintain().catch(()=>this.logger.warn('Se reintentará la limpieza de videos.')),3600000);this.timer.unref();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  canAdmin(user:User){return (this.config.VIDEO_ADMIN_SLUGS??'ronaldo').split(',').includes(user.slug);}
  admin(user:User){if(!this.canAdmin(user))throw new ForbiddenException('Este perfil no puede administrar los videos.');}
  async transaction<T>(action:(em:EntityManager)=>Promise<T>,revision?:number){return this.db.transaction(async em=>{
    const catalog=await locked(em,VideoCatalog,'c').where('c.id = 1').getOneOrFail();if(revision!==undefined&&revision!==catalog.revision)throw new ConflictException('El catálogo cambió. Recarga y vuelve a intentarlo.');
    const result=await action(em);catalog.revision++;await em.save(catalog);return result;
  });}
  async folder(em:EntityManager,id:string|null){if(id&&!await em.existsBy(VideoFolder,{id}))throw new NotFoundException('Carpeta no encontrada.');}
  async normalize(em:EntityManager,folderId:string|null){const rows=await em.find(Video,{where:{folderId:folderId??IsNull()},order:{position:'ASC',id:'ASC'}});for(let i=0;i<rows.length;i++)if(rows[i].position!==i+1)await em.update(Video,rows[i].id,{position:i+1});}
  async catalog(user:User){
    // One consistent DB snapshot; no physical storage paths or upload internals are exposed.
    return this.db.transaction(async em=>{const [folders,videos,progress,favorites,catalog]=await Promise.all([
      em.find(VideoFolder,{order:{position:'ASC',id:'ASC'}}),em.find(Video,{order:{position:'ASC',id:'ASC'}}),em.findBy(VideoProgress,{userId:user.id}),em.findBy(VideoFavorite,{userId:user.id}),em.findOneByOrFail(VideoCatalog,{id:1})]);
      const p=new Map(progress.map(x=>[x.videoId,x])),f=new Set(favorites.map(x=>x.videoId));return {revision:catalog.revision,canAdmin:this.canAdmin(user),downloads:this.config.VIDEO_DOWNLOADS==='true',watchTogether:this.config.WATCH_TOGETHER_ENABLED==='true',maxBytes:this.config.VIDEO_MAX_BYTES??20*1024**3,chunkBytes:CHUNK,
        folders:folders.map(x=>({...x,count:videos.filter(v=>v.folderId===x.id).length})),videos:videos.map(({sha256,...v})=>({...v,progress:p.get(v.id)||null,favorite:f.has(v.id)}))};});
  }
  async createFolder(data:{name:string;description:string;position?:number}){return this.transaction(async em=>{
    const rows=await em.find(VideoFolder,{order:{position:'ASC'}});const now=Date.now();const folder=em.create(VideoFolder,{id:randomUUID(),name:data.name,description:data.description,coverId:null,position:rows.length+1,createdAt:now,updatedAt:now});rows.splice(Math.min((data.position??rows.length+1)-1,rows.length),0,folder);
    for(let i=0;i<rows.length;i++){rows[i].position=i+1;await em.save(rows[i]);}return folder;
  });}
  async editFolder(id:string,data:{name:string;description:string;position:number;revision:number}){return this.transaction(async em=>{
    const row=await em.findOneBy(VideoFolder,{id});if(!row)throw new NotFoundException();row.name=data.name;row.description=data.description;row.updatedAt=Date.now();
    const rows=(await em.find(VideoFolder,{order:{position:'ASC'}})).filter(x=>x.id!==id);rows.splice(Math.min(data.position-1,rows.length),0,row);for(let i=0;i<rows.length;i++){rows[i].position=i+1;await em.save(rows[i]);}return row;
  },data.revision);}
  async deleteFolder(id:string,removeVideos:boolean,revision:number){await this.transaction(async em=>{
    const folder=await em.findOneBy(VideoFolder,{id});if(!folder)throw new NotFoundException();
    const videos=await em.findBy(Video,{folderId:id});if(removeVideos)for(const v of videos)await em.delete(Video,v.id);
    else {let n=await em.countBy(Video,{folderId:IsNull()});for(const v of videos)await em.update(Video,v.id,{folderId:null,position:++n,updatedAt:Date.now()});}
    await em.delete(VideoFolder,id);const rows=await em.find(VideoFolder,{order:{position:'ASC'}});for(let i=0;i<rows.length;i++)await em.update(VideoFolder,rows[i].id,{position:i+1});
  },revision);await this.maintain();return {ok:true};}
  async editVideo(id:string,data:{title:string;description:string;folderId:string|null;position:number;revision:number}){return this.transaction(async em=>{
    const v=await em.findOneBy(Video,{id});if(!v)throw new NotFoundException();await this.folder(em,data.folderId);const old=v.folderId;
    const rows=(await em.find(Video,{where:{folderId:data.folderId??IsNull()},order:{position:'ASC',id:'ASC'}})).filter(x=>x.id!==id);
    Object.assign(v,{title:data.title,description:data.description,folderId:data.folderId,updatedAt:Date.now()});rows.splice(Math.min(data.position-1,rows.length),0,v);
    for(let i=0;i<rows.length;i++){rows[i].position=i+1;await em.save(rows[i]);}if(old!==data.folderId)await this.normalize(em,old);return {ok:true};
  },data.revision);}
  async deleteVideo(id:string,revision:number){await this.transaction(async em=>{const v=await em.findOneBy(Video,{id});if(!v)throw new NotFoundException();await em.delete(Video,id);await this.normalize(em,v.folderId);},revision);await this.maintain();return {ok:true};}
  async image(kind:'folder'|'video',id:string,buffer?:Buffer){const imageId=buffer?randomUUID():null;if(buffer)await this.storage.image(imageId!,buffer);
    try{await this.transaction(async em=>{if(kind==='folder'){if(!await em.existsBy(VideoFolder,{id}))throw new NotFoundException();await em.update(VideoFolder,id,{coverId:imageId,updatedAt:Date.now()});}else {if(!await em.existsBy(Video,{id}))throw new NotFoundException();await em.update(Video,id,{thumbnailId:imageId,updatedAt:Date.now()});}});}catch(e){if(imageId)await this.storage.remove(imageId,'webp');throw e;}await this.maintain();return {ok:true};
  }
  async imageExists(id:string){if(!await this.db.getRepository(VideoFolder).existsBy({coverId:id})&&!await this.db.getRepository(Video).existsBy({thumbnailId:id}))throw new NotFoundException();}
  async video(id:string){const v=await this.db.getRepository(Video).findOneBy({id});if(!v)throw new NotFoundException('Video no encontrado.');return v;}
  async progress(userId:string,id:string,seconds:number,completed:boolean,reset:boolean){return this.db.transaction(async em=>{
    const v=await locked(em,Video,'v').where('v.id = :id',{id}).getOne();if(!v)throw new NotFoundException();
    const old=await em.findOneBy(VideoProgress,{userId,videoId:id});seconds=reset?0:Math.min(seconds,v.duration);const percent=seconds/v.duration*100;
    await em.save(VideoProgress,{userId,videoId:id,seconds,percent,completed:reset?false:!!old?.completed||percent>=95||(completed&&seconds>=v.duration-2),updatedAt:Date.now()});return {ok:true};
  });}
  async favorite(userId:string,id:string,value:boolean){await this.db.transaction(async em=>{if(!await locked(em,Video,'v').where('v.id = :id',{id}).getOne())throw new NotFoundException();if(value)await em.save(VideoFavorite,{userId,videoId:id,createdAt:Date.now()});else await em.delete(VideoFavorite,{userId,videoId:id});});return {ok:true};}
  async startUpload(userId:string,data:{folderId:string|null;title:string;description:string;filename:string;bytes:number;lastModified:number;fingerprint:string}){
    if(data.bytes>(this.config.VIDEO_MAX_BYTES??20*1024**3))throw new BadRequestException('El archivo supera el tamaño configurado.');await this.storage.space(data.bytes);
    return this.transaction(async em=>{await this.folder(em,data.folderId);if(await em.count(VideoUpload)>=3)throw new ConflictException('Hay tres subidas pendientes. Reanuda o cancela una antes de empezar otra.');const row=em.create(VideoUpload,{...data,id:randomUUID(),userId,received:0,updatedAt:Date.now()});
      const f=await open(this.storage.path(row.id,'part'),'wx',0o600);await f.close();try{return await em.save(row);}catch(e){await this.storage.remove(row.id,'part');throw e;}
    });
  }
  async uploads(userId:string){return this.db.getRepository(VideoUpload).find({where:{userId},order:{updatedAt:'DESC'}});}
  async upload(id:string,userId:string){const row=await this.db.getRepository(VideoUpload).findOneBy({id,userId});if(!row)throw new NotFoundException('Subida no encontrada o caducada.');return row;}
  async chunk(id:string,userId:string,offset:number,length:number,input:Readable){
    if(!Number.isSafeInteger(length)||length<1||length>CHUNK)throw new BadRequestException('Bloque inválido; máximo 8 MiB.');await this.storage.space(length);
    return this.db.transaction(async em=>{const u=await locked(em,VideoUpload,'u').where('u.id = :id AND u.userId = :userId',{id,userId}).getOne();if(!u)throw new NotFoundException();if(this.finishing.has(id)||u.received!==offset||offset+length>u.bytes)throw new ConflictException('Consulta el avance confirmado antes de reintentar.');
      const f=await open(this.storage.path(id,'part'),constants.O_RDWR|constants.O_NOFOLLOW);let read=0;try{await f.truncate(offset);for await(const raw of input){const b=Buffer.from(raw);read+=b.length;if(read>length)throw new BadRequestException('Bloque mayor al declarado.');let written=0;while(written<b.length){const r=await f.write(b,written,b.length-written,offset+read-b.length+written);written+=r.bytesWritten;}}
        if(read!==length)throw new BadRequestException('Bloque incompleto.');await f.sync();u.received+=read;u.updatedAt=Date.now();await em.save(u);return {received:u.received};
      }catch(e){await f.truncate(offset);throw e;}finally{await f.close();}
    });
  }
  async cancel(id:string,userId:string){await this.db.transaction(async em=>{const u=await locked(em,VideoUpload,'u').where('u.id = :id AND u.userId = :userId',{id,userId}).getOne();if(!u)throw new NotFoundException();if(this.finishing.has(id))throw new ConflictException('Espera a que termine la validación.');await em.delete(VideoUpload,id);});await this.storage.remove(id,'part');return {ok:true};}
  async finish(id:string,userId:string){
    const existing=await this.db.getRepository(Video).findOneBy({id});if(existing)return {id:existing.id};
    if(this.finishing.size)throw new ConflictException('Hay otro video validándose. Reintenta en un momento.');this.finishing.add(id);
    try{
      const u=await this.upload(id,userId);if(u.received!==u.bytes)throw new BadRequestException('La subida todavía no está completa.');
      // Recover a crash between atomic rename and the DB commit.
      try{await stat(this.storage.path(id,'part'));}catch{await rename(this.storage.path(id,'mp4'),this.storage.path(id,'part'));}
      const prepared=await this.storage.prepare(id,u.bytes),info=prepared.info;
      const result=await this.transaction(async em=>{const current=await locked(em,VideoUpload,'u').where('u.id = :id AND u.userId = :userId',{id,userId}).getOne();if(!current)throw new NotFoundException();await this.folder(em,current.folderId);
        const duplicate=await em.findOneBy(Video,{sha256:info.sha256});if(duplicate){await em.delete(VideoUpload,id);return {id:duplicate.id,duplicate:true};}
        await chmod(prepared.path,0o640);await rename(prepared.path,this.storage.path(id,'mp4'));
        const now=Date.now();await em.save(Video,{id,folderId:current.folderId,title:current.title,description:current.description,thumbnailId:null,position:await em.countBy(Video,{folderId:current.folderId??IsNull()})+1,...info,createdAt:now,updatedAt:now});await em.delete(VideoUpload,id);return {id};
      });
      // Publication succeeded. Cleanup failure must not turn a successful upload into an error.
      await this.storage.remove(id,'part').catch(()=>{});return result;
    }finally{await rm(this.storage.preparedPath(id),{force:true}).catch(()=>{});this.finishing.delete(id);}
  }
  async disk(){const d=await this.storage.free();const videos=await this.db.getRepository(Video).find({select:{bytes:true}}),uploads=await this.db.getRepository(VideoUpload).find({select:{received:true}});return {...d,videoBytes:videos.reduce((a,v)=>a+v.bytes,0),partialBytes:uploads.reduce((a,v)=>a+v.received,0)};}
  async maintain(){if(this.cleaning||this.finishing.size)return;this.cleaning=true;try{
    await this.storage.init();const old=await this.db.getRepository(VideoUpload).findBy({updatedAt:LessThan(Date.now()-7*86400000)});for(const u of old)await this.db.transaction(async em=>{const current=await locked(em,VideoUpload,'u').where('u.id = :id',{id:u.id}).getOne();if(current&&current.updatedAt<Date.now()-7*86400000){await this.storage.remove(u.id,'part');await em.delete(VideoUpload,u.id);}});
    // Grace window protects files written just before their transaction commits.
    for(const name of await readdir(resolvePath(this.storage.root,'media'))){const match=/^\.([0-9a-f-]{36})\.prepared$/.exec(name);if(match){const p=this.storage.preparedPath(match[1]);if((await stat(p)).mtimeMs<Date.now()-3600000)await rm(p,{force:true});}}
    for(const [sub,kind] of [['media','mp4'],['images','webp'],['partial','part']] as const)for(const name of await readdir(resolvePath(this.storage.root,sub))){const id=name.slice(0,-kind.length-1);if(!/^[0-9a-f-]{36}$/.test(id)||name!==`${id}.${kind}`)continue;const file=await stat(this.storage.path(id,kind));if(file.mtimeMs>Date.now()-3600000)continue;
      const linked=kind==='webp'?await this.db.getRepository(VideoFolder).existsBy({coverId:id})||await this.db.getRepository(Video).existsBy({thumbnailId:id}):await this.db.getRepository(VideoUpload).existsBy({id})||(kind==='mp4'&&await this.db.getRepository(Video).existsBy({id}));if(!linked)await this.storage.remove(id,kind);
    }
  }finally{this.cleaning=false;}}
}
import { join as resolvePath } from 'node:path';
