import { Injectable,OnModuleInit,OnModuleDestroy,Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { MailJob,CalendarEvent,Reminder } from '../agenda/entities';
import { User,Task,Notification } from '../database/entities';
import { locked } from '../database/data-source';
import { MailService } from './mail.service';
@Injectable()
export class MailWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private running=false;private readonly logger=new Logger('MailWorker');
  constructor(private readonly db:DataSource,private readonly mail:MailService){}
  onModuleInit(){this.timer=setInterval(()=>void this.tick(),15000);this.timer.unref();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  private async stillValid(job:MailJob){
    if(job.kind==='event')return this.db.getRepository(CalendarEvent).existsBy({id:job.resourceId,ownerId:job.userId,email:true});
    if(job.kind==='task')return this.db.getRepository(Task).existsBy({id:job.resourceId,ownerId:job.userId,email:true,completed:false});
    if(job.kind==='reminder'){const r=await this.db.getRepository(Reminder).findOneBy({id:job.resourceId,targetId:job.userId,email:true});return r!==null&&r.completedAt===null;}
    return false;
  }
  async tick(){if(this.running||!this.mail.available())return;this.running=true;try{
    for(let i=0;i<5;i++){
      const now=Date.now();
      const job=await this.db.transaction(async em=>{
        const j=await locked(em,MailJob,'j').where('(j.status = :pending AND j.nextAttemptAt <= :now) OR (j.status = :sending AND j.lockedUntil <= :now)',{pending:'pending',sending:'sending',now}).orderBy('j.nextAttemptAt','ASC').getOne();
        if(!j)return null;
        j.status='sending';j.lockedUntil=now+120000;j.leaseToken=randomUUID();j.attempts++;return em.save(j);
      });
      if(!job)break;
      const where={id:job.id,status:'sending',leaseToken:job.leaseToken!};
      if(!await this.stillValid(job)){await this.db.getRepository(MailJob).update(where,{status:'cancelled',lockedUntil:null,leaseToken:null});continue;}
      const user=await this.db.getRepository(User).findOneBy({id:job.userId});if(!user){await this.db.getRepository(MailJob).delete(where);continue;}
      try{
        await this.mail.sendNotice(user.email,job.subject,job.body,job.id);
        await this.db.getRepository(MailJob).update(where,{status:'sent',lockedUntil:null,leaseToken:null});
      }catch{
        await this.db.transaction(async em=>{
          const current=await locked(em,MailJob,'j').where('j.id = :id AND j.leaseToken = :lease',{id:job.id,lease:job.leaseToken}).getOne();if(!current)return;
          current.status=current.attempts>=5?'failed':'pending';current.nextAttemptAt=Date.now()+Math.min(30,2**(current.attempts-1))*60000;current.lockedUntil=null;current.leaseToken=null;await em.save(current);
          if(current.status==='failed')await em.save(Notification,{id:randomUUID(),userId:job.userId,text:'No se pudo enviar un aviso por correo tras varios intentos. El recordatorio sigue disponible aquí.',kind:'mail',resourceId:null,dismissed:false,createdAt:Date.now()});
        });
      }
    }
  }catch{this.logger.error('La cola de correo no pudo avanzar. Se reintentará.');}finally{this.running=false;}}
}
