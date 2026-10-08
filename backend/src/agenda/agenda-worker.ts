import { Injectable,OnModuleInit,OnModuleDestroy,Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CalendarEvent,Reminder } from './entities';
import { User } from '../database/entities';
import { locked } from '../database/data-source';
import { nextOccurrence } from './recurrence';
import { createAlert } from './alerts';
const date=(at:number)=>new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(at);
@Injectable()
export class AgendaWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private running=false;private readonly logger=new Logger('AgendaWorker');
  constructor(private readonly db:DataSource){}
  onModuleInit(){this.timer=setInterval(()=>void this.tick(),30000);this.timer.unref();void this.tick();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async tick(){if(this.running)return;this.running=true;try{
    const now=Date.now();
    const events=await this.db.getRepository(CalendarEvent).createQueryBuilder('e').where('e.nextAlertAt <= :now',{now}).orderBy('e.nextAlertAt','ASC').take(50).getMany();
    for(const row of events)await this.db.transaction(async em=>{
      const e=await locked(em,CalendarEvent,'e').where('e.id = :id',{id:row.id}).getOne();
      if(!e||e.nextAlertAt===null||e.nextAlertAt>now||e.alertOccurrenceAt===null||e.alertMinutes===null)return;
      // After downtime notify the queued occurrence once and jump ahead; never flood old repetitions.
      const text=`${e.alertOccurrenceAt<now?'Evento pendiente de revisar':'En tu agenda'}: ${e.title}`;
      await createAlert(em,e.ownerId,'event',e.id,text,e.email,`${text}\n${date(e.alertOccurrenceAt)}\n${e.location}\n${e.notes}`);
      const next=nextOccurrence(e.startsAt,e.recurrence,Math.max(e.alertOccurrenceAt+1,now+e.alertMinutes*60000+1),e.recurrenceUntil);
      e.alertOccurrenceAt=next;e.nextAlertAt=next===null?null:next-e.alertMinutes*60000;await em.save(e);
    });
    const reminders=await this.db.getRepository(Reminder).createQueryBuilder('r').where('r.deliveredAt IS NULL AND r.completedAt IS NULL AND r.remindAt <= :now',{now}).orderBy('r.remindAt','ASC').take(50).getMany();
    for(const row of reminders)await this.db.transaction(async em=>{
      const r=await locked(em,Reminder,'r').where('r.id = :id',{id:row.id}).getOne();if(!r||r.deliveredAt!==null||r.completedAt!==null||r.remindAt>now)return;
      const owner=await em.findOneByOrFail(User,{id:r.ownerId});const text=r.ownerId===r.targetId?`Tu recordatorio: ${r.title}`:`${owner.name} te recuerda: ${r.title}`;
      await createAlert(em,r.targetId,'reminder',r.id,text,r.email,`${text}\n${date(r.remindAt)}\n${r.notes}`);r.deliveredAt=now;await em.save(r);
    });
  }catch{this.logger.error('No se pudo procesar la agenda. Se reintentará en el próximo ciclo.');}finally{this.running=false;}}
}
