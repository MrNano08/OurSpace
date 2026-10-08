import { Controller,Get,Post,Patch,Delete,Req,Body,Param } from '@nestjs/common';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid } from '../common/validation';
import { CollectionsService } from './collections.service';
import { GalleryService } from './gallery.service';
const named=z.object({name:z.string().trim().min(1).max(80)}).strict();
@Controller('collections')
export class CollectionsController {
  constructor(private readonly collections:CollectionsService,private readonly gallery:GalleryService){}
  @Get('albums') albums(@Req()r:AuthRequest){return this.collections.albums(r.user.id);}
  @Post('albums') create(@Req()r:AuthRequest,@Body()raw:unknown){return this.collections.create(r.user.id,parse(named,raw).name);}
  @Patch('albums/:id') rename(@Req()r:AuthRequest,@Param('id')id:string,@Body()raw:unknown){return this.collections.rename(r.user.id,parse(uuid,id),parse(named,raw).name);}
  @Delete('albums/:id') remove(@Req()r:AuthRequest,@Param('id')id:string){return this.collections.remove(r.user.id,parse(uuid,id));}
  @Post('favorites/:id') favorite(@Req()r:AuthRequest,@Param('id')id:string,@Body()raw:unknown){const b=parse(z.object({favorite:z.boolean()}).strict(),raw);return this.collections.favorite(r.user.id,parse(uuid,id),b.favorite);}
  @Get('memory') async memory(@Req()r:AuthRequest){const result=await this.collections.daily(r.user.id);return {day:result.day,photo:result.photo?await this.gallery.detail(result.photo.id,r.user.id):null};}
}
