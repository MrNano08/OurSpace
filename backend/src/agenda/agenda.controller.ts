import { Controller,Get,Post,Patch,Delete,Req,Query,Param,Body,NotFoundException,BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid } from '../common/validation';
import { locked } from '../database/data-source';
import { User,Notification } from '../database/entities';
import { CalendarEvent,MailJob } from './entities';
import { recurrenceRules,nextOccurrence,occurrencesBetween } from './recurrence';
import { MailService } from '../mail/mail.service';
const instant=z.number().int().min(0).max(4102444800000);
export const eventFields=z.object({
  title:z.string().trim().min(1).max(120),notes:z.string().max(2000).default(''),location:z.string().trim().max(200).default(''),
  startsAt:instant,endsAt:instant,recurrence:z.enum(recurrenceRules).default('none'),recurrenceUntil:instant.nullable().default(null),
  alertMinutes:z.union([z.literal(0),z.literal(5),z.literal(15),z.literal(30),z.literal(60),z.literal(1440)]).nullable().default(15),email:z.boolean().default(false)
}).strict().superRefine((v,c)=>{
  if(v.endsAt<=v.startsAt||v.endsAt-v.startsAt>7*86400000)c.addIssue({code:'custom',message:'El fin debe ser posterior al inicio; duración máxima de 7 días.'});
  if(v.recurrenceUntil!==null&&v.recurrenceUntil<v.startsAt)c.addIssue({code:'custom',message:'El límite de repetición no puede ser anterior al inicio.'});
  if(v.email&&v.alertMinutes===null)c.addIssue({code:'custom',message:'Activa un aviso para recibir correo.'});
});
export function scheduleEvent(v:{startsAt:number;recurrence:string;recurrenceUntil:number|null;alertMinutes:number|null},now=Date.now()){
  const next=v.alertMinutes===null?null:nextOccurrence(v.startsAt,v.recurrence,now,v.recurrenceUntil);
  return {alertOccurrenceAt:next,nextAlertAt:next===null?null:next-v.alertMinutes!*60000};
}
@Controller('agenda')
export class AgendaController {
  constructor(private readonly db:DataSource,private readonly mail:MailService){}
  @Get() async list(@Req()r:AuthRequest,@Query()query:unknown){
    const p=parse(z.object({from:z.coerce.number().int().min(0),to:z.coerce.number().int().min(0)}).strict().refine(v=>v.to>v.from&&v.to-v.from<=42*86400000,'Consulta hasta 42 días a la vez.'),query);
    const rows=await this.db.getRepository(CalendarEvent).find({where:{ownerId:r.user.id},order:{startsAt:'ASC'}});
    const items=rows.flatMap(e=>occurrencesBetween(e.startsAt,e.recurrence,p.from-(e.endsAt-e.startsAt)+1,p.to,e.recurrenceUntil).map(at=>({...e,occurrenceAt:at,occurrenceEnd:at+e.endsAt-e.startsAt})));
    return {items:items.sort((a,b)=>a.occurrenceAt-b.occurrenceAt||a.id.localeCompare(b.id)),from:p.from,to:p.to};
  }
  @Post() async create(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(eventFields,body);if(b.email&&!this.mail.available())throw new BadRequestException('Configura Gmail antes de activar avisos por correo.');
    return this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:r.user.id}).getOneOrFail();
      if(await em.countBy(CalendarEvent,{ownerId:r.user.id})>=200)throw new BadRequestException('La agenda admite hasta 200 eventos o series. Elimina los que ya no necesitas.');
      return em.save(CalendarEvent,{id:randomUUID(),ownerId:r.user.id,...b,...scheduleEvent(b),createdAt:Date.now(),updatedAt:Date.now()});
    });
  }
  @Patch(':id') async update(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){
    const id=parse(uuid,raw),b=parse(eventFields,body);
    if(b.email&&!this.mail.available())throw new BadRequestException('Configura Gmail antes de activar avisos por correo.');
    return this.db.transaction(async em=>{
      const e=await locked(em,CalendarEvent,'e').where('e.id = :id AND e.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!e)throw new NotFoundException('Evento no encontrado.');
      // Preserve the cursor on text-only edits, so an already delivered alert is not repeated.
      const changed=['startsAt','endsAt','recurrence','recurrenceUntil','alertMinutes','email'].some(k=>(e as any)[k]!==(b as any)[k]);
      if(changed){await em.delete(MailJob,{resourceId:id,kind:'event',status:'pending'});await em.delete(Notification,{userId:r.user.id,resourceId:id,kind:'event'});}
      return em.save(CalendarEvent,Object.assign(e,b,changed?scheduleEvent(b):{},{updatedAt:Date.now()}));
    });
  }
  @Delete(':id') async remove(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);await this.db.transaction(async em=>{
    const e=await locked(em,CalendarEvent,'e').where('e.id = :id AND e.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!e)throw new NotFoundException('Evento no encontrado.');
    await em.delete(MailJob,{resourceId:id,kind:'event'});await em.delete(Notification,{userId:r.user.id,resourceId:id,kind:'event'});await em.remove(e);
  });return {ok:true};}
}
