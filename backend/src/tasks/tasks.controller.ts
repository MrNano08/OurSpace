import { Controller,Get,Post,Patch,Delete,Req,Body,Param,Query,NotFoundException,BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Task,Notification } from '../database/entities';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid } from '../common/validation';
import { locked } from '../database/data-source';
import { recurrenceRules,nextOccurrence } from '../agenda/recurrence';
import { MailJob } from '../agenda/entities';
import { MailService } from '../mail/mail.service';
const instant=z.number().int().min(0).max(4102444800000);
const fields=z.object({title:z.string().trim().min(1).max(120),notes:z.string().max(2000).default(''),priority:z.number().int().min(1).max(3),dueAt:instant.nullable().default(null),recurrence:z.enum(recurrenceRules).default('none'),recurrenceUntil:instant.nullable().default(null),email:z.boolean().default(false)}).strict();
// PATCH must not apply create defaults to omitted fields (Zod 4 preserves nested defaults).
const patchFields=z.object({title:z.string().trim().min(1).max(120).optional(),notes:z.string().max(2000).optional(),priority:z.number().int().min(1).max(3).optional(),dueAt:instant.nullable().optional(),recurrence:z.enum(recurrenceRules).optional(),recurrenceUntil:instant.nullable().optional(),email:z.boolean().optional(),completed:z.boolean().optional()}).strict();
function validate(t:{dueAt:number|null;recurrence:string;recurrenceUntil:number|null;email:boolean}){
  if((t.recurrence!=='none'||t.email)&&t.dueAt===null)throw new BadRequestException('La repetición y los avisos por correo requieren una fecha límite.');
  if(t.dueAt!==null&&t.recurrenceUntil!==null&&t.recurrenceUntil<t.dueAt)throw new BadRequestException('El fin de repetición debe ser posterior a la fecha límite.');
}
@Controller('tasks')
export class TasksController {
  constructor(private readonly db:DataSource,private readonly mail:MailService){}
  @Get() async list(@Req()r:AuthRequest,@Query()query:unknown){
    const p=parse(z.object({page:z.coerce.number().int().min(1).max(100000).default(1),completed:z.enum(['true','false']).default('false'),limit:z.coerce.number().int().min(1).max(50).default(20)}).strict(),query);
    const q=this.db.getRepository(Task).createQueryBuilder('t').where('t.ownerId = :ownerId AND t.completed = :completed',{ownerId:r.user.id,completed:p.completed==='true'});
    q.addSelect('CASE WHEN t.dueAt IS NOT NULL AND t.dueAt < :now THEN 0 ELSE 1 END','overdueRank').setParameter('now',Date.now());
    q.addSelect('CASE WHEN t.dueAt IS NULL THEN 1 ELSE 0 END','undatedRank');
    const [items,total]=await q.orderBy('overdueRank','ASC').addOrderBy('t.priority','DESC').addOrderBy('undatedRank','ASC').addOrderBy('t.dueAt','ASC').addOrderBy('t.createdAt','DESC').addOrderBy('t.id','ASC').skip((p.page-1)*p.limit).take(p.limit).getManyAndCount();return {items,total,page:p.page,limit:p.limit};
  }
  @Post() async create(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(fields,body);validate(b);if(b.email&&!this.mail.available())throw new BadRequestException('Configura Gmail antes de activar avisos por correo.');
    return this.db.getRepository(Task).save({id:randomUUID(),ownerId:r.user.id,...b,recurrenceAnchor:b.dueAt,nextTaskId:null,completed:false,dueNotified:false,createdAt:Date.now(),updatedAt:Date.now()});
  }
  @Patch(':id') async update(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){
    const id=parse(uuid,raw),b=parse(patchFields,body);
    return this.db.transaction(async em=>{
      const t=await locked(em,Task,'t').where('t.id = :id AND t.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!t)throw new NotFoundException('Tarea no encontrada.');
      if(t.nextTaskId&&b.completed===false)throw new BadRequestException('Esta tarea ya creó su siguiente repetición. Edita la tarea pendiente.');
      const merged={...t,...b};validate(merged);if(b.email===true&&!this.mail.available())throw new BadRequestException('Configura Gmail antes de activar avisos por correo.');
      if(b.dueAt!==undefined&&b.dueAt!==t.dueAt){merged.dueNotified=false;merged.recurrenceAnchor=b.dueAt;await em.delete(Notification,{userId:r.user.id,resourceId:id,kind:'task'});await em.delete(MailJob,{resourceId:id,kind:'task',status:'pending'});}
      if(b.email===false)await em.delete(MailJob,{resourceId:id,kind:'task',status:'pending'});
      if(b.completed===true){
        await em.delete(Notification,{userId:r.user.id,resourceId:id,kind:'task'});await em.delete(MailJob,{resourceId:id,kind:'task',status:'pending'});
        if(!t.completed&&!t.nextTaskId&&merged.recurrence!=='none'&&merged.dueAt!==null){
          const anchor=merged.recurrenceAnchor??merged.dueAt;
          const next=nextOccurrence(anchor,merged.recurrence,Math.max(Date.now(),merged.dueAt+1),merged.recurrenceUntil);
          if(next!==null){const nextId=randomUUID();await em.save(Task,{...merged,id:nextId,dueAt:next,recurrenceAnchor:anchor,nextTaskId:null,completed:false,dueNotified:false,createdAt:Date.now(),updatedAt:Date.now()});merged.nextTaskId=nextId;}
        }
      }
      return em.save(Task,Object.assign(t,merged,{updatedAt:Date.now()}));
    });
  }
  @Delete(':id') async remove(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);await this.db.transaction(async em=>{
    const t=await locked(em,Task,'t').where('t.id = :id AND t.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!t)throw new NotFoundException('Tarea no encontrada.');
    await em.delete(Notification,{userId:r.user.id,resourceId:id,kind:'task'});await em.delete(MailJob,{resourceId:id,kind:'task'});await em.remove(t);
  });return {ok:true};}
}
