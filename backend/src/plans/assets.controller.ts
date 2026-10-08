import { Controller,Get,Post,Delete,Req,Res,Param,UploadedFile,UseInterceptors,BadRequestException,StreamableFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid } from '../common/validation';
import { User } from '../database/entities';
import { publicProfile } from '../auth/auth.service';
import { PhotoUploadGate } from '../gallery/upload-gate';
import { MAX_PHOTO_BYTES } from '../gallery/storage';
import { AssetsService } from './assets.service';
@Controller()
export class AssetsController {
  constructor(private readonly assets:AssetsService,private readonly db:DataSource){}
  @Get('profiles') async profiles(){return (await this.db.getRepository(User).find({order:{slug:'ASC'}})).map(u=>({...publicProfile(u),avatarId:u.avatarId}));}
  @Post('profile/avatar') @UseInterceptors(PhotoUploadGate,FileInterceptor('file',{limits:{fileSize:MAX_PHOTO_BYTES,files:1,fields:0,parts:1}}))
  avatar(@Req()r:AuthRequest,@UploadedFile()file?:Express.Multer.File){if(!file)throw new BadRequestException('Selecciona una foto.');return this.assets.avatar(r.user.id,file.buffer);}
  @Delete('profile/avatar') remove(@Req()r:AuthRequest){return this.assets.removeAvatar(r.user.id);}
  @Get('assets/:id') async file(@Req()r:AuthRequest,@Param('id')id:string,@Res({passthrough:true})res:Response){
    const stream=await this.assets.file(parse(uuid,id),r.user.id);res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    return new StreamableFile(stream,{type:'image/webp',disposition:'inline; filename="imagen.webp"'});
  }
}
