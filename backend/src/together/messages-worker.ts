import { Injectable,OnModuleInit,OnModuleDestroy,Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Message } from './entities';
import { User } from '../database/entities';
import { locked } from '../database/data-source';
import { createAlert } from '../agenda/alerts';

@Injectable()
export class MessagesWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private running=false;private readonly logger=new Logger('MessagesWorker');
  constructor(private readonly db:DataSource){}
  onModuleInit(){this.timer=setInterval(()=>void this.tick(),15000);this.timer.unref();void this.tick();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async tick(){if(this.running)return;this.running=true;try{
    const now=Date.now();
    const due=await this.db.getRepository(Message).createQueryBuilder('m').where('m.releasedAt IS NULL AND m.deliverAt <= :now',{now}).orderBy('m.deliverAt','ASC').addOrderBy('m.id','ASC').take(50).getMany();
    for(const row of due)await this.db.transaction(async em=>{
      const m=await locked(em,Message,'m').where('m.id = :id',{id:row.id}).getOne();
      if(!m||m.releasedAt!==null||m.deliverAt>now)return;
      const owner=await em.findOneByOrFail(User,{id:m.ownerId});
      await createAlert(em,m.targetId,'message',m.id,`${owner.name} te dejó un mensaje.`,false);
      m.releasedAt=now;await em.save(m);
    });
  }catch{this.logger.error('No se pudieron procesar los mensajes programados. Se reintentará en el próximo ciclo.');}finally{this.running=false;}}
}
