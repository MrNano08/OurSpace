import { Controller,Patch,Body,Req } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { z } from 'zod';
import { User } from '../database/entities';
import { AuthRequest } from '../auth/auth.guard';
import { ownProfile } from '../auth/auth.service';
import { parse } from '../common/validation';
@Controller('profile')
export class UsersController {
  constructor(private readonly db:DataSource){}
  @Patch() async update(@Req()r:AuthRequest,@Body()body:unknown){
    const b=parse(z.object({name:z.string().trim().min(1).max(50),accent:z.enum(['rose','sage','lavender','blue'])}).strict(),body);
    await this.db.getRepository(User).update({id:r.user.id},b);return ownProfile(await this.db.getRepository(User).findOneByOrFail({id:r.user.id}));
  }
}
