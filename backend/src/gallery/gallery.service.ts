import { Injectable,BadRequestException,NotFoundException,ForbiddenException,HttpException,Logger } from '@nestjs/common';
import { DataSource,IsNull } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { User,Notification } from '../database/entities';
import { locked } from '../database/data-source';
import { hashPassword,verifyPassword } from '../common/security';
import { createAlert } from '../agenda/alerts';
import { Photo,PhotoAccess } from './entities';
import { PhotoFavorite } from '../plans/entities';
import { visiblePhotoSql,albumFor } from './collections.service';
import { PhotoStorage } from './storage';
import { uploadSchema,metadataSchema } from './metadata';
import { parse } from '../common/validation';
export type GallerySection='available'|'protected'|'upcoming'|'favorites'|'all';
@Injectable()
export class GalleryService {
  private readonly logger=new Logger('Gallery');
  constructor(private readonly db:DataSource,private readonly storage:PhotoStorage){}
  async photo(id:string,userId:string){
    const p=await this.db.getRepository(Photo).findOneBy({id,deletedAt:IsNull()});
    if(!p||p.ownerId!==userId&&p.targetId!==userId)throw new NotFoundException('Foto no encontrada.');return p;
  }
  async accessible(p:Photo,userId:string){
    if(p.ownerId===userId)return true;
    if(p.targetId!==userId||p.unlockAt!==null&&p.unlockAt>Date.now())return false;
    return p.passwordHash===null||await this.db.getRepository(PhotoAccess).existsBy({photoId:p.id,userId,unlocked:true});
  }
  present(p:Photo,userId:string,access:boolean,favorite=false){
    const upcoming=p.unlockAt!==null&&p.unlockAt>Date.now();
    const base={id:p.id,ownerId:p.ownerId,createdAt:p.createdAt,unlockAt:p.unlockAt,protected:p.passwordHash!==null,accessible:access,lockReason:upcoming?'date':p.passwordHash!==null?'password':null};
    if(!access)return base;
    return {...base,favorite,albumId:p.albumId,description:p.description,location:p.location,album:p.album,tags:p.tags,capturedAt:p.capturedAt,captureOffset:p.captureOffset,dateSource:p.dateSource,width:p.width,height:p.height,bytes:p.bytes,format:p.format};
  }
  async detail(id:string,userId:string){const p=await this.photo(id,userId);return this.present(p,userId,await this.accessible(p,userId),await this.db.getRepository(PhotoFavorite).existsBy({photoId:id,userId}));}
  async list(userId:string,section:GallerySection,cursor?:string,albumId?:string,tag?:string){
    const now=Date.now();const q=this.db.getRepository(Photo).createQueryBuilder('p')
      .leftJoinAndMapOne('p.access',PhotoAccess,'a','a.photoId = p.id AND a.userId = :userId',{userId})
      .leftJoinAndMapOne('p.savedFavorite',PhotoFavorite,'f','f.photoId = p.id AND f.userId = :userId',{userId})
      .where('p.deletedAt IS NULL AND (p.ownerId = :userId OR p.targetId = :userId)',{userId});
    if(section==='upcoming')q.andWhere('p.unlockAt > :now',{now});
    else if(section!=='favorites'&&section!=='all'){q.andWhere('(p.unlockAt IS NULL OR p.unlockAt <= :now)',{now});q.andWhere(section==='protected'?'p.passwordHash IS NOT NULL':'p.passwordHash IS NULL');}
    if(section==='favorites'){q.andWhere('f.photoId IS NOT NULL');q.andWhere(visiblePhotoSql,{userId,now,yes:true});}
    if(albumId||tag){q.andWhere(visiblePhotoSql,{userId,now,yes:true});if(albumId)q.andWhere('p.albumId = :albumId',{albumId});if(tag)q.andWhere("p.tags LIKE :tag ESCAPE '!'",{tag:'%'+JSON.stringify(tag).replace(/[!%_]/g,'!$&')+'%'});}
    if(cursor){
      let value:unknown;try{value=JSON.parse(Buffer.from(cursor,'base64url').toString('utf8'));}catch{throw new BadRequestException('Cursor inválido.');}
      const [at,id]=parse(z.tuple([z.number().int().min(0).max(4102444800000),z.uuid()]),value);
      q.andWhere('(p.createdAt < :at OR (p.createdAt = :at AND p.id < :id))',{at,id});
    }
    const rows=await q.orderBy('p.createdAt','DESC').addOrderBy('p.id','DESC').take(25).getMany();
    const more=rows.length>24,items=rows.slice(0,24);const last=items.at(-1);
    return {items:items.map(p=>this.present(p,userId,p.ownerId===userId||p.targetId===userId&&(p.unlockAt===null||p.unlockAt<=now)&&(p.passwordHash===null||(p as Photo&{access?:PhotoAccess}).access?.unlocked===true),Boolean((p as Photo&{savedFavorite?:PhotoFavorite}).savedFavorite))),nextCursor:more&&last?Buffer.from(JSON.stringify([last.createdAt,last.id])).toString('base64url'):null};
  }
  async upload(user:User,buffer:Buffer,raw:unknown){
    const b=parse(uploadSchema,raw);if(b.unlockAt!==null&&b.unlockAt<=Date.now())throw new BadRequestException('La fecha para abrir debe estar en el futuro.');
    if(await this.db.getRepository(Photo).countBy({deletedAt:IsNull()})>=10000)throw new BadRequestException('La galería llegó a su límite de 10 000 fotos.');
    const id=randomUUID(),passwordHash=b.password===null?null:await hashPassword(b.password);
    const stored=await this.storage.prepare(id,buffer);
    try{return await this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:user.id}).getOneOrFail();
      const album=await albumFor(em,user.id,b.album);
      const peer=await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:user.id}).getOne();if(!peer)throw new BadRequestException('Falta el otro perfil.');
      const manual=b.capturedAt!==undefined;
      const p=await em.save(Photo,{id,ownerId:user.id,targetId:peer.id,description:b.description,location:b.location,album:album?.name||'',albumId:album?.id||null,tags:b.tags,
        capturedAt:manual?b.capturedAt:stored.capture.date,captureOffset:manual?null:stored.capture.offset,dateSource:manual?(b.capturedAt===null?'none':'manual'):(stored.capture.date?'exif':'none'),
        exifCapturedAt:stored.capture.date,exifOffset:stored.capture.offset,format:stored.format,width:stored.width,height:stored.height,bytes:stored.bytes,passwordHash,unlockAt:b.unlockAt,
        announced:b.unlockAt===null,deletedAt:null,createdAt:Date.now()});
      if(p.announced)await createAlert(em,peer.id,'photo',id,`${user.name} agregó una foto a la galería.`,false);
      return this.present(p,user.id,true);
    });}catch(e){await this.storage.remove(id);throw e;}
  }
  async unlock(id:string,userId:string,password:string){
    const result=await this.db.transaction(async em=>{
      const p=await locked(em,Photo,'p').where('p.id = :id AND p.deletedAt IS NULL AND (p.ownerId = :userId OR p.targetId = :userId)',{id,userId}).getOne();
      if(!p)throw new NotFoundException('Foto no encontrada.');
      if(p.ownerId===userId)return 'ok';
      // Date takes precedence: no password verification, attempts or grant before it.
      if(p.unlockAt!==null&&p.unlockAt>Date.now())return 'early';
      if(p.passwordHash===null)return 'ok';
      const a=await em.findOneBy(PhotoAccess,{photoId:id,userId})||em.create(PhotoAccess,{photoId:id,userId,unlocked:false,attempts:0,lockedUntil:0});
      if(a.unlocked)return 'ok';if(a.lockedUntil>Date.now())return 'blocked';
      if(a.lockedUntil!==0){a.attempts=0;a.lockedUntil=0;}
      if(!await verifyPassword(password,p.passwordHash)){
        a.attempts++;if(a.attempts>=5)a.lockedUntil=Date.now()+15*60000;await em.save(a);return a.lockedUntil?'blocked':'wrong';
      }
      a.unlocked=true;a.attempts=0;a.lockedUntil=0;await em.save(a);return 'ok';
    });
    // Throw outside the transaction so failed attempts remain persisted.
    if(result==='early')throw new ForbiddenException('Esta foto todavía no puede abrirse.');
    if(result==='blocked')throw new HttpException('Demasiados intentos. Vuelve a probar en 15 minutos.',429);
    if(result==='wrong')throw new BadRequestException('La contraseña no coincide.');
    return this.detail(id,userId);
  }
  async edit(id:string,userId:string,raw:unknown){
    const b=parse(metadataSchema,raw);return this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :userId',{userId}).getOneOrFail();
      const p=await locked(em,Photo,'p').where('p.id = :id AND p.ownerId = :userId AND p.deletedAt IS NULL',{id,userId}).getOne();if(!p)throw new NotFoundException('Foto no encontrada.');
      if(p.capturedAt!==b.capturedAt){p.dateSource=b.capturedAt===null?'none':'manual';p.captureOffset=null;}
      const album=await albumFor(em,userId,b.album);Object.assign(p,b,{albumId:album?.id||null,album:album?.name||''});await em.save(p);return this.present(p,userId,true);
    });
  }
  async remove(id:string,userId:string){
    await this.db.transaction(async em=>{
      const p=await locked(em,Photo,'p').where('p.id = :id AND p.ownerId = :userId AND p.deletedAt IS NULL',{id,userId}).getOne();if(!p)throw new NotFoundException('Foto no encontrada.');
      p.deletedAt=Date.now();await em.save(p);await em.delete(Notification,{kind:'photo',resourceId:id});
    });await this.purge(id);return {ok:true};
  }
  async purge(id:string){try{await this.storage.remove(id);await this.db.getRepository(Photo).createQueryBuilder().delete().where('id = :id AND deletedAt IS NOT NULL',{id}).execute();}catch{this.logger.warn('El archivo eliminado se volverá a limpiar en el próximo ciclo.');}}
  async maintain(){
    const rows=await this.db.getRepository(Photo).createQueryBuilder('p').where('p.deletedAt IS NOT NULL').take(20).getMany();for(const p of rows)await this.purge(p.id);
    const due=await this.db.getRepository(Photo).createQueryBuilder('p').where('p.announced = :no AND p.deletedAt IS NULL AND (p.unlockAt IS NULL OR p.unlockAt <= :now)',{no:false,now:Date.now()}).take(50).getMany();
    for(const row of due)await this.db.transaction(async em=>{
      const p=await locked(em,Photo,'p').where('p.id = :id',{id:row.id}).getOne();if(!p||p.deletedAt!==null||p.announced||p.unlockAt!==null&&p.unlockAt>Date.now())return;
      await createAlert(em,p.targetId,'photo',p.id,p.passwordHash?'Una foto ya está lista para desbloquear.':'Una foto ya está disponible en la galería.',false);p.announced=true;await em.save(p);
    });
  }
  async cleanOrphans(){const photos=await this.db.getRepository(Photo).find({select:{id:true}});await this.storage.cleanOrphans(new Set(photos.map(p=>p.id)));}
}
