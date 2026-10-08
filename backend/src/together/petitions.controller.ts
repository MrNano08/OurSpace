import { Controller,Get,Post,Delete,Req,Body,Query,Param,BadRequestException,NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid,pageSchema } from '../common/validation';
import { locked } from '../database/data-source';
import { User,Notification } from '../database/entities';
import { createAlert } from '../agenda/alerts';
import { Petition,petitionStatuses,petitionLabels } from './entities';

@Controller('petitions')
export class PetitionsController {
  constructor(private readonly db:DataSource){}
  @Get() async list(@Req()r:AuthRequest,@Query()query:unknown){
    const p=parse(pageSchema.extend({view:z.enum(['incoming','mine']).default('incoming'),status:z.enum(['all',...petitionStatuses]).default('all')}).strict(),query);
    const q=this.db.getRepository(Petition).createQueryBuilder('p').where(p.view==='mine'?'p.ownerId = :userId':'p.targetId = :userId',{userId:r.user.id});
    if(p.status!=='all')q.andWhere('p.status = :status',{status:p.status});
    const [items,total]=await q.orderBy('p.createdAt','DESC').addOrderBy('p.id','DESC').skip((p.page-1)*20).take(20).getManyAndCount();return {items,total,page:p.page};
  }
  @Get(':id') async one(@Req()r:AuthRequest,@Param('id')raw:string){
    const id=parse(uuid,raw);const p=await this.db.getRepository(Petition).createQueryBuilder('p').where('p.id = :id AND (p.ownerId = :userId OR p.targetId = :userId)',{id,userId:r.user.id}).getOne();
    if(!p)throw new NotFoundException('Petición no encontrada.');return p;
  }
  @Post() async create(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(z.object({title:z.string().trim().min(1).max(120),details:z.string().trim().max(3000).default('')}).strict(),body);
    return this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:r.user.id}).getOneOrFail();
      if(await em.countBy(Petition,{ownerId:r.user.id})>=1000)throw new BadRequestException('Elimina peticiones antiguas antes de crear más (máximo 1000).');
      const other=await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:r.user.id}).getOne();if(!other)throw new BadRequestException('Falta el otro perfil.');
      const now=Date.now();const p=await em.save(Petition,{id:randomUUID(),ownerId:r.user.id,targetId:other.id,...b,status:'pending',responseNote:'',createdAt:now,updatedAt:now});
      await createAlert(em,other.id,'petition',p.id,`${r.user.name} tiene una petición: ${p.title}`,false);return p;
    });
  }
  @Post(':id/respond') async respond(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){
    const id=parse(uuid,raw),b=parse(z.object({status:z.enum(['accepted','rejected','chance','maybe']),note:z.string().trim().max(1000).default('')}).strict(),body);
    return this.db.transaction(async em=>{
      const p=await locked(em,Petition,'p').where('p.id = :id AND p.targetId = :userId',{id,userId:r.user.id}).getOne();if(!p)throw new NotFoundException('Petición no encontrada.');
      if(p.status===b.status&&p.responseNote===b.note)return p;
      p.status=b.status;p.responseNote=b.note;p.updatedAt=Date.now();await em.save(p);
      // Keep only the latest answer notice; no automatic reminder for any answer.
      await em.delete(Notification,{resourceId:p.id,kind:'petition',userId:p.ownerId});
      await createAlert(em,p.ownerId,'petition',p.id,`${r.user.name}: ${petitionLabels[p.status]} · ${p.title}`,false);return p;
    });
  }
  @Delete(':id') async remove(@Req()r:AuthRequest,@Param('id')raw:string){
    const id=parse(uuid,raw);await this.db.transaction(async em=>{
      const p=await locked(em,Petition,'p').where('p.id = :id AND p.ownerId = :userId',{id,userId:r.user.id}).getOne();if(!p)throw new NotFoundException('Petición no encontrada.');
      await em.delete(Notification,{resourceId:id,kind:'petition'});await em.remove(p);
    });return {ok:true};
  }
}
