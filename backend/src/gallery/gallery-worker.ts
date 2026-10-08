import { Injectable,OnModuleInit,OnModuleDestroy,Logger } from '@nestjs/common';
import { AssetsService } from '../plans/assets.service';
import { GalleryService } from './gallery.service';
@Injectable()
export class GalleryWorker implements OnModuleInit,OnModuleDestroy {
  private timer?:ReturnType<typeof setInterval>;private running=false;private cleanedAt=0;private logger=new Logger('GalleryWorker');
  constructor(private readonly gallery:GalleryService,private readonly assets:AssetsService){}
  onModuleInit(){this.timer=setInterval(()=>void this.tick(),30000);this.timer.unref();void this.tick();}
  onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
  async tick(){if(this.running)return;this.running=true;try{await this.gallery.maintain();await this.assets.maintain();if(Date.now()-this.cleanedAt>3600000){await this.gallery.cleanOrphans();await this.assets.maintain(true);this.cleanedAt=Date.now();}}catch{this.logger.warn('La galería reintentará sus tareas de mantenimiento.');}finally{this.running=false;}}
}
