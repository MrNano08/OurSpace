import { Controller,Get,Post,Req,Param,Query,NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Notification } from '../database/entities';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid,pageSchema } from '../common/validation';
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly db:DataSource){}
  @Get() async list(@Req()r:AuthRequest,@Query()query:unknown){const {page}=parse(pageSchema.strict(),query);const [items,total]=await this.db.getRepository(Notification).findAndCount({where:{userId:r.user.id,dismissed:false},order:{createdAt:'DESC',id:'DESC'},skip:(page-1)*30,take:30});return {items,total,page};}
  @Post(':id/dismiss') async dismiss(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);const result=await this.db.getRepository(Notification).update({id,userId:r.user.id},{dismissed:true});if(!result.affected)throw new NotFoundException('Notificación no encontrada.');return {ok:true};}
}
