import { Injectable,Inject,NotFoundException,ConflictException,GoneException,OnModuleDestroy } from '@nestjs/common';
import { CONFIG,Config } from '../../common/config';
import { VideosService } from '../videos.service';
import { WatchRoom } from './room';
@Injectable()
export class TogetherService implements OnModuleDestroy {
  private room?:WatchRoom;private timer?:ReturnType<typeof setInterval>;
  constructor(@Inject(CONFIG)private config:Config,private videos:VideosService){}
  enabled(){if(this.config.WATCH_TOGETHER_ENABLED!=='true'){this.onModuleDestroy();throw new NotFoundException('Ver juntos está desactivado.');}}
  async join(user:string,clientId:string,videoId:string,position:number,paused:boolean){this.enabled();const video=await this.videos.video(videoId);this.enabled();
    if(this.room?.tick()){this.onModuleDestroy();}
    if(this.room&&this.room.videoId!==videoId){if(this.room.members.size)throw new ConflictException('Tu persona especial está en otro video. Abre el mismo video para unirte.');this.onModuleDestroy();}
    if(!this.room){this.room=new WatchRoom(videoId,video.duration,position,paused);this.timer=setInterval(()=>{if(this.room?.tick())this.onModuleDestroy();},15000);this.timer.unref();}
    return this.room.join(user,clientId);
  }
  get(id:string){this.enabled();if(!this.room||this.room.id!==id)throw new GoneException('La sesión terminó. Vuelve a entrar a Ver juntos.');return this.room;}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);this.timer=undefined;const old=this.room;this.room=undefined;old?.close();}
}
