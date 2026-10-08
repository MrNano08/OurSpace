import { Injectable,Inject,NotFoundException,Logger } from '@nestjs/common';
import { DataSource,IsNull } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { CONFIG,Config } from '../common/config';
import { PhotoStorage } from '../gallery/storage';
import { User } from '../database/entities';
import { locked } from '../database/data-source';
import { ownProfile } from '../auth/auth.service';
import { PrivateAsset,Wish } from './entities';
@Injectable()
export class AssetsService {
  readonly storage:PhotoStorage;private logger=new Logger('PrivateAssets');
  constructor(private readonly db:DataSource,@Inject(CONFIG)c:Config,photos:PhotoStorage){this.storage=new PhotoStorage({...c,PHOTO_STORAGE_DIR:join(photos.root,'assets')});}
  async avatar(userId:string,buffer:Buffer){
    const id=randomUUID();await this.storage.prepare(id,buffer,false);
    try{return await this.db.transaction(async em=>{
      const user=await locked(em,User,'u').where('u.id = :id',{id:userId}).getOneOrFail();
      const peer=await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:userId}).getOne();if(!peer)throw new NotFoundException('Falta el otro perfil.');
      await em.save(PrivateAsset,{id,ownerId:userId,targetId:peer.id,kind:'avatar',deletedAt:null,createdAt:Date.now()});
      if(user.avatarId)await em.update(PrivateAsset,{id:user.avatarId},{deletedAt:Date.now()});user.avatarId=id;await em.save(user);return ownProfile(user);
    });}catch(e){await this.storage.remove(id);throw e;}
  }
  async removeAvatar(userId:string){return this.db.transaction(async em=>{
    const user=await locked(em,User,'u').where('u.id = :id',{id:userId}).getOneOrFail();if(user.avatarId)await em.update(PrivateAsset,{id:user.avatarId},{deletedAt:Date.now()});user.avatarId=null;await em.save(user);return ownProfile(user);
  });}
  async file(id:string,userId:string){
    const asset=await this.db.getRepository(PrivateAsset).findOneBy({id,deletedAt:IsNull()});if(!asset||asset.ownerId!==userId&&asset.targetId!==userId)throw new NotFoundException('Imagen no encontrada.');
    const linked=asset.kind==='avatar'?await this.db.getRepository(User).existsBy({avatarId:id}):await this.db.getRepository(Wish).existsBy({assetId:id});
    if(!linked)throw new NotFoundException('Imagen no encontrada.');
    try{return (await this.storage.file(id,asset.kind==='avatar'?'thumb':'medium')).createReadStream();}catch{throw new NotFoundException('Imagen no disponible.');}
  }
  async maintain(orphans=false){
    const rows=await this.db.getRepository(PrivateAsset).createQueryBuilder('a').where('a.deletedAt IS NOT NULL').take(20).getMany();
    for(const a of rows)try{await this.storage.remove(a.id);await this.db.getRepository(PrivateAsset).delete(a.id);}catch{this.logger.warn('Se reintentará limpiar una imagen reemplazada.');}
    if(orphans){const rows=await this.db.getRepository(PrivateAsset).find({select:{id:true}});await this.storage.cleanOrphans(new Set(rows.map(a=>a.id)));}
  }
}
