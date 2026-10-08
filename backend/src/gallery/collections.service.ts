import { Injectable,BadRequestException,NotFoundException,ForbiddenException,ConflictException } from '@nestjs/common';
import { DataSource,EntityManager,IsNull } from 'typeorm';
import { randomUUID,randomInt } from 'node:crypto';
import { User } from '../database/entities';
import { locked } from '../database/data-source';
import { Album,PhotoFavorite,DailyMemory } from '../plans/entities';
import { Photo,PhotoAccess } from './entities';
// Reused by all filters: inaccessible metadata must never influence the response.
export const visiblePhotoSql='(p.ownerId = :userId OR (p.targetId = :userId AND (p.unlockAt IS NULL OR p.unlockAt <= :now) AND (p.passwordHash IS NULL OR a.unlocked = :yes)))';
export async function albumFor(em:EntityManager,ownerId:string,name:string){
  if(!name)return null;
  const existing=await em.findOneBy(Album,{ownerId,name});if(existing)return existing;
  if(await em.countBy(Album,{ownerId})>=200)throw new BadRequestException('Máximo 200 álbumes por persona.');
  return em.save(Album,{id:randomUUID(),ownerId,name,createdAt:Date.now()});
}
@Injectable()
export class CollectionsService {
  constructor(private readonly db:DataSource){}
  async albums(userId:string){
    const rows=await this.db.getRepository(Photo).createQueryBuilder('p').leftJoin(PhotoAccess,'a','a.photoId = p.id AND a.userId = :userId',{userId})
      .select('p.albumId','id').addSelect('COUNT(*)','count').where('p.deletedAt IS NULL AND p.albumId IS NOT NULL').andWhere(visiblePhotoSql,{userId,now:Date.now(),yes:true}).groupBy('p.albumId').getRawMany();
    const counts=new Map<string,number>(rows.map(r=>[r.id,Number(r.count)]));
    // Only owned albums and albums with at least one authorized photo have visible names.
    const q=this.db.getRepository(Album).createQueryBuilder('a').where('a.ownerId = :userId',{userId});if(counts.size)q.orWhere('a.id IN (:...ids)',{ids:[...counts.keys()]});
    return (await q.orderBy('a.name','ASC').getMany()).map(a=>({...a,count:counts.get(a.id)||0}));
  }
  async create(userId:string,name:string){return this.db.transaction(async em=>{await locked(em,User,'u').where('u.id = :userId',{userId}).getOneOrFail();return albumFor(em,userId,name);});}
  async rename(userId:string,id:string,name:string){return this.db.transaction(async em=>{
    await locked(em,User,'u').where('u.id = :userId',{userId}).getOneOrFail();const album=await em.findOneBy(Album,{id,ownerId:userId});if(!album)throw new NotFoundException('Álbum no encontrado.');
    const other=await em.findOneBy(Album,{ownerId:userId,name});if(other&&other.id!==id)throw new ConflictException('Ya tienes un álbum con ese nombre.');
    album.name=name;await em.save(album);await em.update(Photo,{albumId:id,ownerId:userId},{album:name});return album;
  });}
  async remove(userId:string,id:string){await this.db.transaction(async em=>{
    await locked(em,User,'u').where('u.id = :userId',{userId}).getOneOrFail();const album=await em.findOneBy(Album,{id,ownerId:userId});if(!album)throw new NotFoundException('Álbum no encontrado.');
    await em.update(Photo,{albumId:id,ownerId:userId},{albumId:null,album:''});await em.remove(album);
  });return {ok:true};}
  async favorite(userId:string,id:string,value:boolean){return this.db.transaction(async em=>{
    const p=await locked(em,Photo,'p').where('p.id = :id AND p.deletedAt IS NULL AND (p.ownerId = :userId OR p.targetId = :userId)',{id,userId}).getOne();if(!p)throw new NotFoundException('Foto no encontrada.');
    if(value&&p.ownerId!==userId&&(p.unlockAt!==null&&p.unlockAt>Date.now()||p.passwordHash!==null&&!await em.existsBy(PhotoAccess,{photoId:id,userId,unlocked:true})))throw new ForbiddenException('Primero debes poder abrir la foto.');
    if(value){if(!await em.existsBy(PhotoFavorite,{photoId:id,userId}))await em.save(PhotoFavorite,{photoId:id,userId,createdAt:Date.now()});}
    else await em.delete(PhotoFavorite,{photoId:id,userId});return {favorite:value};
  });}
  async daily(userId:string){
    const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit'}).format(Date.now());
    const result=await this.db.transaction(async em=>{
      const users=await em.getRepository(User).find({order:{id:'ASC'},select:{id:true}});if(users.length!==2||!users.some(u=>u.id===userId))return null;
      await locked(em,User,'u').where('u.id = :id',{id:users[0].id}).getOneOrFail();
      const eligible=()=>em.getRepository(Photo).createQueryBuilder('p').leftJoin(PhotoAccess,'a','a.photoId = p.id AND a.userId = p.targetId')
        .where('p.deletedAt IS NULL AND p.ownerId != p.targetId AND p.ownerId IN (:...ids) AND p.targetId IN (:...ids)',{ids:users.map(u=>u.id)})
        .andWhere('(p.unlockAt IS NULL OR p.unlockAt <= :now) AND (p.passwordHash IS NULL OR a.unlocked = :yes)',{now:Date.now(),yes:true});
      let memory=await em.findOneBy(DailyMemory,{day});
      if(!memory){const candidates=await eligible().select(['p.id']).orderBy('p.id','ASC').getMany();if(!candidates.length)return null;memory=await em.save(DailyMemory,{day,photoId:candidates[randomInt(candidates.length)].id});}
      if(!memory.photoId)return null;
      return eligible().andWhere('p.id = :id',{id:memory.photoId}).getOne();
    });return {day,photo:result};
  }
}
