import { Controller,Get,Post,Patch,Delete,Req,Body,Query,Param,UploadedFile,UseInterceptors,BadRequestException,NotFoundException,ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid,pageSchema } from '../common/validation';
import { User,Notification } from '../database/entities';
import { locked } from '../database/data-source';
import { createAlert } from '../agenda/alerts';
import { PhotoUploadGate } from '../gallery/upload-gate';
import { MAX_PHOTO_BYTES } from '../gallery/storage';
import { Wish,PrivateAsset } from './entities';
import { AssetsService } from './assets.service';
const fields={title:z.string().trim().min(1).max(120),notes:z.string().max(3000),url:z.string().trim().max(2000).refine(v=>{if(!v)return true;try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'Usa un enlace http o https sin credenciales'),priceCents:z.number().int().min(0).max(10000000000).nullable(),currency:z.enum(['CRC','USD'])};
const create=z.object({kind:z.enum(['experience','purchase']),title:fields.title,notes:fields.notes.default(''),url:fields.url.default(''),priceCents:fields.priceCents.default(null),currency:fields.currency.default('CRC')}).strict();
const patch=z.object({...fields,completed:z.boolean(),revision:z.number().int().min(1)}).strict();
@Controller('wishes')
export class WishesController {
  constructor(private readonly db:DataSource,private readonly assets:AssetsService){}
  @Get() async list(@Req()r:AuthRequest,@Query()raw:unknown){const b=parse(pageSchema.extend({kind:z.enum(['experience','purchase']),completed:z.enum(['true','false']).default('false')}).strict(),raw);
    const [items,total]=await this.db.getRepository(Wish).createQueryBuilder('w').where('(w.ownerId = :id OR w.targetId = :id) AND w.kind = :kind AND w.completed = :done',{id:r.user.id,kind:b.kind,done:b.completed==='true'}).orderBy('w.createdAt','DESC').addOrderBy('w.id','DESC').skip((b.page-1)*20).take(20).getManyAndCount();return {items,total,page:b.page};}
  @Get(':id') async detail(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);const w=await this.db.getRepository(Wish).createQueryBuilder('w').where('w.id = :id AND (w.ownerId = :userId OR w.targetId = :userId)',{id,userId:r.user.id}).getOne();if(!w)throw new NotFoundException('Elemento no encontrado.');return w;}
  @Post() async create(@Req()r:AuthRequest,@Body()raw:unknown){const b=parse(create,raw);return this.db.transaction(async em=>{
    await locked(em,User,'u').where('u.id = :id',{id:r.user.id}).getOneOrFail();if(await em.countBy(Wish,{ownerId:r.user.id})>=2000)throw new BadRequestException('Elimina elementos antiguos antes de crear más (máximo 2000).');
    const peer=await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:r.user.id}).getOne();if(!peer)throw new BadRequestException('Falta el otro perfil.');
    const now=Date.now();const wish=await em.save(Wish,{id:randomUUID(),ownerId:r.user.id,targetId:peer.id,...b,completed:false,revision:1,assetId:null,createdAt:now,updatedAt:now});
    await createAlert(em,peer.id,'wish',wish.id,`${r.user.name} agregó ${b.kind==='experience'?'un plan a Wishlist':'una idea a Algún día'}: ${b.title}`,false);return wish;
  });}
  @Patch(':id') async update(@Req()r:AuthRequest,@Param('id')rawId:string,@Body()raw:unknown){const id=parse(uuid,rawId),b=parse(patch,raw);return this.db.transaction(async em=>{
    const w=await locked(em,Wish,'w').where('w.id = :id AND (w.ownerId = :userId OR w.targetId = :userId)',{id,userId:r.user.id}).getOne();if(!w)throw new NotFoundException('Elemento no encontrado.');
    if(w.revision!==b.revision)throw new ConflictException('La otra persona cambió este elemento. Recarga los datos antes de guardar.');
    const changed=w.completed!==b.completed;Object.assign(w,b,{revision:w.revision+1,updatedAt:Date.now()});await em.save(w);
    if(changed)await createAlert(em,w.ownerId===r.user.id?w.targetId:w.ownerId,'wish',w.id,`${r.user.name} ${w.completed?'marcó como realizado':'volvió a dejar pendiente'}: ${w.title}`,false);return w;
  });}
  @Delete(':id') async remove(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);await this.db.transaction(async em=>{
    const w=await locked(em,Wish,'w').where('w.id = :id AND w.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!w)throw new NotFoundException('Elemento no encontrado.');
    if(w.assetId)await em.update(PrivateAsset,{id:w.assetId},{deletedAt:Date.now()});await em.delete(Notification,{kind:'wish',resourceId:id});await em.remove(w);
  });return {ok:true};}
  @Post(':id/photo') @UseInterceptors(PhotoUploadGate,FileInterceptor('file',{limits:{fileSize:MAX_PHOTO_BYTES,files:1,fields:0,parts:1}}))
  async photo(@Req()r:AuthRequest,@Param('id')raw:string,@UploadedFile()file?:Express.Multer.File){
    const id=parse(uuid,raw);await this.detail(r,id);if(!file)throw new BadRequestException('Selecciona una imagen.');
    const assetId=randomUUID();await this.assets.storage.prepare(assetId,file.buffer,false);
    try{return await this.db.transaction(async em=>{
      const w=await locked(em,Wish,'w').where('w.id = :id AND (w.ownerId = :userId OR w.targetId = :userId)',{id,userId:r.user.id}).getOne();if(!w)throw new NotFoundException('Elemento no encontrado.');
      await em.save(PrivateAsset,{id:assetId,ownerId:w.ownerId,targetId:w.targetId,kind:'wish',deletedAt:null,createdAt:Date.now()});
      if(w.assetId)await em.update(PrivateAsset,{id:w.assetId},{deletedAt:Date.now()});w.assetId=assetId;w.revision++;w.updatedAt=Date.now();await em.save(w);return w;
    });}catch(e){await this.assets.storage.remove(assetId);throw e;}
  }
  @Delete(':id/photo') async removePhoto(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);return this.db.transaction(async em=>{
    const w=await locked(em,Wish,'w').where('w.id = :id AND (w.ownerId = :userId OR w.targetId = :userId)',{id,userId:r.user.id}).getOne();if(!w)throw new NotFoundException('Elemento no encontrado.');
    if(w.assetId){await em.update(PrivateAsset,{id:w.assetId},{deletedAt:Date.now()});w.assetId=null;w.revision++;w.updatedAt=Date.now();await em.save(w);}return w;
  });}
}
