import { Controller,Get,Post,Patch,Delete,Req,Res,Body,Query,Param,UploadedFile,UseInterceptors,BadRequestException,ForbiddenException,StreamableFile,NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid,password } from '../common/validation';
import { GalleryService } from './gallery.service';
import { PhotoStorage,MAX_PHOTO_BYTES } from './storage';
import { PhotoUploadGate } from './upload-gate';
@Controller('gallery')
export class GalleryController {
  constructor(private readonly gallery:GalleryService,private readonly storage:PhotoStorage){}
  @Get() list(@Req()r:AuthRequest,@Query()raw:unknown){const b=parse(z.object({section:z.enum(['available','protected','upcoming','favorites','all']).default('available'),cursor:z.string().min(1).max(200).optional(),albumId:uuid.optional(),tag:z.string().trim().min(1).max(40).optional()}).strict(),raw);return this.gallery.list(r.user.id,b.section,b.cursor,b.albumId,b.tag);}
  @Post() @UseInterceptors(PhotoUploadGate,FileInterceptor('file',{limits:{fileSize:MAX_PHOTO_BYTES,files:1,fields:1,fieldSize:16384,parts:2}}))
  upload(@Req()r:AuthRequest,@UploadedFile()file:Express.Multer.File|undefined,@Body()body:unknown){
    if(!file)throw new BadRequestException('Selecciona una foto.');
    const field=parse(z.object({metadata:z.string().max(16384)}).strict(),body);
    let metadata:unknown;try{metadata=JSON.parse(field.metadata);}catch{throw new BadRequestException('Datos de la foto inválidos.');}
    return this.gallery.upload(r.user,file.buffer,metadata);
  }
  @Get(':id') detail(@Req()r:AuthRequest,@Param('id')raw:string){return this.gallery.detail(parse(uuid,raw),r.user.id);}
  @Get(':id/file/:variant') async file(@Req()r:AuthRequest,@Res({passthrough:true})res:Response,@Param('id')raw:string,@Param('variant')rawVariant:string){
    const id=parse(uuid,raw),variant=parse(z.enum(['thumb','medium','original']),rawVariant),p=await this.gallery.photo(id,r.user.id);
    if(!await this.gallery.accessible(p,r.user.id))throw new ForbiddenException('Desbloquea la foto cuando llegue su momento.');
    let handle;try{handle=await this.storage.file(id,variant);}catch{throw new NotFoundException('El archivo de la foto no está disponible.');}
    res.setHeader('Cache-Control','private, no-store, max-age=0');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cross-Origin-Resource-Policy','same-origin');
    const original=variant==='original',ext=p.format==='jpeg'?'jpg':p.format;
    return new StreamableFile(handle.createReadStream(),{type:original?'image/'+p.format:'image/webp',disposition:`${original?'attachment':'inline'}; filename="foto-${id}.${original?ext:'webp'}"`});
  }
  @Post(':id/unlock') unlock(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){const b=parse(z.object({password}).strict(),body);return this.gallery.unlock(parse(uuid,raw),r.user.id,b.password);}
  @Patch(':id') edit(@Req()r:AuthRequest,@Param('id')raw:string,@Body()body:unknown){return this.gallery.edit(parse(uuid,raw),r.user.id,body);}
  @Delete(':id') remove(@Req()r:AuthRequest,@Param('id')raw:string){return this.gallery.remove(parse(uuid,raw),r.user.id);}
}
