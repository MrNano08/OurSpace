import { Controller,Get,Post,Delete,Req,Body,Query,Param,BadRequestException,NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid } from '../common/validation';
import { locked } from '../database/data-source';
import { User,Notification } from '../database/entities';
import { Reminder,MailJob } from './entities';
import { MailService } from '../mail/mail.service';
@Controller('reminders')
export class RemindersController {
  constructor(private readonly db:DataSource,private readonly mail:MailService){}
  @Get('options') options(){return {emailAvailable:this.mail.available()};}
  @Get() async list(@Req()r:AuthRequest,@Query()query:unknown){
    const p=parse(z.object({page:z.coerce.number().int().min(1).max(100000).default(1),view:z.enum(['mine','other']).default('mine'),completed:z.enum(['true','false']).default('false')}).strict(),query);
    const q=this.db.getRepository(Reminder).createQueryBuilder('r');
    if(p.view==='mine')q.where('r.targetId = :id',{id:r.user.id});else q.where('r.ownerId = :id AND r.targetId != :id',{id:r.user.id});
    q.andWhere(p.completed==='true'?'r.completedAt IS NOT NULL':'r.completedAt IS NULL');
    const [items,total]=await q.orderBy('r.remindAt','ASC').addOrderBy('r.id','ASC').skip((p.page-1)*20).take(20).getManyAndCount();return {items,total,page:p.page};
  }
  @Post() async create(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(z.object({title:z.string().trim().min(1).max(120),notes:z.string().max(2000).default(''),target:z.enum(['self','other']),remindAt:z.number().int().min(0).max(4102444800000),email:z.boolean().default(false)}).strict(),body);
    if(b.remindAt<Date.now()-60000)throw new BadRequestException('Elige ahora o una fecha futura.');
    if(b.email&&!this.mail.available())throw new BadRequestException('Configura Gmail antes de activar avisos por correo.');
    return this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:r.user.id}).getOneOrFail();
      if(await em.countBy(Reminder,{ownerId:r.user.id})>=1000)throw new BadRequestException('Elimina recordatorios antiguos antes de crear más (máximo 1000).');
      const other=b.target==='other'?await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:r.user.id}).getOne():r.user;
      if(!other)throw new BadRequestException('Falta el otro perfil.');
      const {target,...fields}=b;
      return em.save(Reminder,{id:randomUUID(),ownerId:r.user.id,targetId:other.id,...fields,deliveredAt:null,completedAt:null,createdAt:Date.now()});
    });
  }
  @Post(':id/complete') async complete(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);return this.db.transaction(async em=>{
    const rem=await locked(em,Reminder,'r').where('r.id = :id AND r.targetId = :targetId',{id,targetId:r.user.id}).getOne();if(!rem)throw new NotFoundException('Recordatorio no encontrado.');
    if(rem.completedAt===null)rem.completedAt=Date.now();await em.save(rem);await em.delete(Notification,{resourceId:id,kind:'reminder'});await em.delete(MailJob,{resourceId:id,kind:'reminder',status:'pending'});return rem;
  });}
  @Delete(':id') async remove(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);await this.db.transaction(async em=>{
    const rem=await locked(em,Reminder,'r').where('r.id = :id AND r.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!rem)throw new NotFoundException('Recordatorio no encontrado.');
    await em.delete(Notification,{resourceId:id,kind:'reminder'});await em.delete(MailJob,{resourceId:id,kind:'reminder'});await em.remove(rem);
  });return {ok:true};}
}
