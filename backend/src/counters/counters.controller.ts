import { Controller,Get,Post,Delete,Req,Body,Param,Query,NotFoundException,BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { User,Counter,CounterChange,Notification } from '../database/entities';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid,pageSchema } from '../common/validation';
import { locked } from '../database/data-source';
@Controller('counters')
export class CountersController {
  constructor(private readonly db:DataSource){}
  @Get() list(@Req()r:AuthRequest){return this.db.getRepository(Counter).find({where:[{ownerId:r.user.id},{targetId:r.user.id}],order:{createdAt:'ASC'}});}
  @Post() async create(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(z.object({label:z.string().trim().min(1).max(80),emoji:z.enum(['👻','😂','😤','🍕','🤍','☕','✨','🐾'])}).strict(),body);
    return this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:r.user.id}).getOneOrFail();
      if(await em.countBy(Counter,{ownerId:r.user.id})>=20)throw new BadRequestException('Puedes tener hasta 20 contadores.');
      const other=await em.getRepository(User).createQueryBuilder('u').where('u.id != :id',{id:r.user.id}).getOne();
      if(!other)throw new BadRequestException('Falta crear el otro perfil. Ejecuta el seed.');
      const c=await em.save(Counter,{id:randomUUID(),ownerId:r.user.id,targetId:other.id,...b,value:0,createdAt:Date.now()});
      await em.save(Notification,{id:randomUUID(),userId:other.id,text:`${r.user.name} agregó: ${b.label}`,kind:'counter',resourceId:c.id,dismissed:false,createdAt:Date.now()});return c;
    });
  }
  @Post(':id/change') async change(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){
    const id=parse(uuid,raw);const b=parse(z.object({delta:z.union([z.literal(1),z.literal(-1)])}).strict(),body);
    return this.db.transaction(async em=>{
      const c=await locked(em,Counter,'c').where('c.id = :id AND c.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();
      if(!c)throw new NotFoundException('Contador no encontrado.');
      if(c.value+b.delta<0||c.value+b.delta>999999)throw new BadRequestException('El contador debe estar entre 0 y 999999.');
      c.value+=b.delta;await em.save(c);
      await em.save(CounterChange,{id:randomUUID(),counterId:c.id,actorId:r.user.id,delta:b.delta,valueAfter:c.value,createdAt:Date.now()});return c;
    });
  }
  @Get(':id/history') async history(@Req()r:AuthRequest,@Param('id')raw:string,@Query()query:unknown){
    const id=parse(uuid,raw);const {page}=parse(pageSchema.strict(),query);
    const c=await this.db.getRepository(Counter).findOne({where:[{id,ownerId:r.user.id},{id,targetId:r.user.id}]});if(!c)throw new NotFoundException('Contador no encontrado.');
    const [items,total]=await this.db.getRepository(CounterChange).findAndCount({where:{counterId:id},order:{createdAt:'DESC',id:'DESC'},skip:(page-1)*30,take:30});return {items,total,page};
  }
  @Delete(':id') async remove(@Req()r:AuthRequest,@Param('id')raw:string){const id=parse(uuid,raw);await this.db.transaction(async em=>{
    const c=await locked(em,Counter,'c').where('c.id = :id AND c.ownerId = :ownerId',{id,ownerId:r.user.id}).getOne();if(!c)throw new NotFoundException('Contador no encontrado.');
    await em.delete(Notification,{resourceId:id,kind:'counter'});await em.remove(c);
  });return {ok:true};}
}
