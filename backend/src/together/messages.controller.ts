import { Controller,Get,Post,Patch,Delete,Req,Body,Query,Param,BadRequestException,NotFoundException,ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid,pageSchema } from '../common/validation';
import { locked } from '../database/data-source';
import { User,Notification } from '../database/entities';
import { createAlert } from '../agenda/alerts';
import { Message } from './entities';

const fields=z.object({body:z.string().trim().min(1).max(5000),deliverAt:z.number().int().min(0).max(4102444800000).nullable().default(null)}).strict();
// Only expose message content and dates. Neither participant can observe the other's deletion.
function present(m:Message){return {id:m.id,ownerId:m.ownerId,targetId:m.targetId,body:m.body,deliverAt:m.deliverAt,scheduled:m.releasedAt===null};}
function future(at:number|null){if(at!==null&&at<=Date.now())throw new BadRequestException('Elige una fecha futura o la opción Ahora.');}
@Controller('messages')
export class MessagesController {
  constructor(private readonly db:DataSource){}
  @Get() async list(@Req()r:AuthRequest,@Query()query:unknown){
    const p=parse(pageSchema.extend({view:z.enum(['conversation','scheduled']).default('conversation')}).strict(),query);
    const q=this.db.getRepository(Message).createQueryBuilder('m');
    if(p.view==='scheduled')q.where('m.ownerId = :userId AND m.releasedAt IS NULL',{userId:r.user.id});
    else q.where('m.releasedAt IS NOT NULL AND m.deliverAt <= :now AND ((m.ownerId = :userId AND m.ownerHidden = :hidden) OR (m.targetId = :userId AND m.targetHidden = :hidden))',{userId:r.user.id,hidden:false,now:Date.now()});
    const [items,total]=await q.orderBy('m.deliverAt',p.view==='scheduled'?'ASC':'DESC').addOrderBy('m.id','DESC').skip((p.page-1)*20).take(20).getManyAndCount();
    return {items:items.map(present),total,page:p.page};
  }
  @Get(':id') async one(@Req()r:AuthRequest,@Param('id')raw:string){
    const id=parse(uuid,raw);const m=await this.db.getRepository(Message).findOneBy({id});
    const visible=m&&(m.ownerId===r.user.id&&!m.ownerHidden||m.targetId===r.user.id&&!m.targetHidden&&m.releasedAt!==null&&m.deliverAt<=Date.now());
    if(!visible)throw new NotFoundException('Mensaje no encontrado.');return present(m);
  }
  @Post() async create(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(fields,body);future(b.deliverAt);
    return this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:r.user.id}).getOneOrFail();
      if(await em.countBy(Message,{ownerId:r.user.id,ownerHidden:false})>=5000)throw new BadRequestException('Elimina mensajes de tu vista antes de crear más (máximo 5000).');
      const other=await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:r.user.id}).getOne();
      if(!other)throw new BadRequestException('Falta el otro perfil.');
      const now=Date.now();const m=await em.save(Message,{id:randomUUID(),ownerId:r.user.id,targetId:other.id,body:b.body,deliverAt:b.deliverAt??now,releasedAt:b.deliverAt===null?now:null,ownerHidden:false,targetHidden:false,createdAt:now});
      if(m.releasedAt!==null)await createAlert(em,other.id,'message',m.id,`${r.user.name} te dejó un mensaje.`,false);
      return present(m);
    });
  }
  @Patch(':id') async edit(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){
    const id=parse(uuid,raw),b=parse(fields,body);if(b.deliverAt===null)throw new BadRequestException('Indica una fecha futura.');future(b.deliverAt);
    return this.db.transaction(async em=>{
      const m=await locked(em,Message,'m').where('m.id = :id AND m.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();
      if(!m)throw new NotFoundException('Mensaje no encontrado.');
      if(m.releasedAt!==null)throw new ConflictException('El mensaje ya está disponible para la otra persona y no se puede editar.');
      m.body=b.body;m.deliverAt=b.deliverAt!;await em.save(m);return present(m);
    });
  }
  @Post(':id/cancel') async cancel(@Req()r:AuthRequest,@Param('id')raw:string){
    const id=parse(uuid,raw);await this.db.transaction(async em=>{
      const m=await locked(em,Message,'m').where('m.id = :id AND m.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();
      if(!m)throw new NotFoundException('Mensaje no encontrado.');
      if(m.releasedAt!==null)throw new ConflictException('Ya está disponible para la otra persona. Puedes eliminarlo de tu vista.');
      await em.remove(m);
    });return {ok:true};
  }
  @Delete(':id') async hide(@Req()r:AuthRequest,@Param('id')raw:string){
    const id=parse(uuid,raw);await this.db.transaction(async em=>{
      const m=await locked(em,Message,'m').where('m.id = :id AND (m.ownerId = :userId OR m.targetId = :userId)',{id,userId:r.user.id}).getOne();
      if(!m||m.releasedAt===null||m.deliverAt>Date.now())throw new NotFoundException('Mensaje no encontrado.');
      if(m.ownerId===r.user.id)m.ownerHidden=true;else m.targetHidden=true;
      await em.delete(Notification,{resourceId:id,kind:'message',userId:r.user.id});
      if(m.ownerHidden&&m.targetHidden)await em.remove(m);else await em.save(m);
    });return {ok:true};
  }
}
