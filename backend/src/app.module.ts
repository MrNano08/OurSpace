import { VideosController } from './videos/videos.controller';
import { VideosService } from './videos/videos.service';
import { VideoStorage } from './videos/storage';
import { DynamicModule,Module,Controller,Get } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { CONFIG,Config } from './common/config';
import { createDataSource } from './database/data-source';
import { AuthGuard,Public } from './auth/auth.guard';
import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { UsersController } from './users/users.controller';
import { TasksController } from './tasks/tasks.controller';
import { CountersController } from './counters/counters.controller';
import { NotificationsController } from './notifications/notifications.controller';
import { NotificationWorker } from './notifications/notification-worker';
import { MailService } from './mail/mail.service';
import { MailWorker } from './mail/mail-worker';
import { AgendaController } from './agenda/agenda.controller';
import { RemindersController } from './agenda/reminders.controller';
import { AgendaWorker } from './agenda/agenda-worker';
import { MessagesController } from './together/messages.controller';
import { MessagesWorker } from './together/messages-worker';
import { PetitionsController } from './together/petitions.controller';
import { GalleryController } from './gallery/gallery.controller';
import { GalleryService } from './gallery/gallery.service';
import { PhotoStorage } from './gallery/storage';
import { PhotoUploadGate } from './gallery/upload-gate';
import { GalleryWorker } from './gallery/gallery-worker';
import { CollectionsController } from './gallery/collections.controller';
import { CollectionsService } from './gallery/collections.service';
import { AssetsController } from './plans/assets.controller';
import { AssetsService } from './plans/assets.service';
import { WishesController } from './plans/wishes.controller';
@Controller('health')
class HealthController {@Public() @Get() get(){return {status:'ok'};}}
@Module({})
export class AppModule {
  static register(config:Config,testDb?:DataSource,testMail?:MailService,worker=true):DynamicModule {
    return {module:AppModule,controllers:[VideosController,HealthController,AuthController,UsersController,TasksController,CountersController,NotificationsController,AgendaController,RemindersController,MessagesController,PetitionsController,GalleryController,CollectionsController,AssetsController,WishesController],providers:[
      {provide:CONFIG,useValue:config},{provide:DataSource,useFactory:async()=>testDb||await createDataSource(config).initialize()},
      VideosService,VideoStorage,CollectionsService,AssetsService,GalleryService,PhotoStorage,PhotoUploadGate,testMail?{provide:MailService,useValue:testMail}:MailService,AuthService,{provide:APP_GUARD,useClass:AuthGuard},...(worker?[NotificationWorker,AgendaWorker,MailWorker,MessagesWorker,GalleryWorker]:[])
    ]};
  }
}
