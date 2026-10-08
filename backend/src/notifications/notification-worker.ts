import { Injectable,OnModuleInit,OnModuleDestroy,Logger } from '@nestjs/common';
import { DataSource,LessThan } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Task,Notification,Session,AuthThrottle,PasswordReset } from '../database/entities';
import { locked } from '../database/data-source';
import { createAlert } from '../agenda/alerts';
@Injectable()
export class NotificationWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private running=false;private logger=new Logger('NotificationWorker');private lastCleanup=0;
  constructor(private readonly db:DataSource){}
  onModuleInit(){this.timer=setInterval(()=>void this.tick(),30000);this.timer.unref();void this.tick();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async tick(){
    if(this.running)return;this.running=true;
    try{
      const tasks=await this.db.getRepository(Task).createQueryBuilder('t').where('t.completed = :no AND t.dueNotified = :no AND t.dueAt <= :now',{no:false,now:Date.now()}).orderBy('t.dueAt','ASC').take(50).getMany();
      for(const task of tasks)await this.db.transaction(async em=>{
        const t=await locked(em,Task,'t').where('t.id = :id',{id:task.id}).getOne();
        if(!t||t.completed||t.dueNotified||t.dueAt===null||t.dueAt>Date.now())return;
        await createAlert(em,t.ownerId,'task',t.id,`Tu tarea llegó a su fecha límite: ${t.title}`,t.email,`${t.title}\n${t.notes}`);
        t.dueNotified=true;await em.save(t);
      });
      if(Date.now()-this.lastCleanup>3600000){await this.db.getRepository(Session).delete({expiresAt:LessThan(Date.now())});await this.db.getRepository(AuthThrottle).delete({expiresAt:LessThan(Date.now())});await this.db.getRepository(PasswordReset).delete({expiresAt:LessThan(Date.now())});this.lastCleanup=Date.now();}
    }catch{this.logger.error('No se pudieron procesar las notificaciones. Se reintentará en el próximo ciclo.');}
    finally{this.running=false;}
  }
}
