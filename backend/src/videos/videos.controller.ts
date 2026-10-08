import { Controller,Get,Post,Patch,Put,Delete,Body,Param,Query,Req,Res,UploadedFile,UseInterceptors,BadRequestException,ForbiddenException,NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { AuthRequest } from '../auth/auth.guard';
import { parse,uuid } from '../common/validation';
import { VideosService } from './videos.service';
import { byteRange } from './storage';
const title=z.string().trim().min(1).max(120),description=z.string().max(5000),position=z.number().int().min(1).max(100000),revision=z.number().int().positive();
@Controller('videos')
export class VideosController {
  constructor(private readonly s:VideosService){}
  @Get() catalog(@Req()r:AuthRequest){return this.s.catalog(r.user);}
  @Get('disk') disk(@Req()r:AuthRequest){this.s.admin(r.user);return this.s.disk();}
  @Post('folders') createFolder(@Req()r:AuthRequest,@Body()body:unknown){this.s.admin(r.user);return this.s.createFolder(parse(z.object({name:title,description:description.default(''),position:position.optional()}).strict(),body));}
  @Patch('folders/:id') editFolder(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){this.s.admin(r.user);return this.s.editFolder(parse(uuid,id),parse(z.object({name:title,description,position,revision}).strict(),body));}
  @Delete('folders/:id') deleteFolder(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){this.s.admin(r.user);const d=parse(z.object({deleteVideos:z.boolean(),confirm:z.literal('ELIMINAR'),revision}).strict(),body);return this.s.deleteFolder(parse(uuid,id),d.deleteVideos,d.revision);}
  @Post('images/:kind/:id') @UseInterceptors(FileInterceptor('file',{limits:{fileSize:8*1024*1024,files:1,fields:0}}))
  image(@Req()r:AuthRequest,@Param('kind')kind:string,@Param('id')id:string,@UploadedFile()file:Express.Multer.File){this.s.admin(r.user);if(!file)throw new BadRequestException('Selecciona una imagen.');return this.s.image(parse(z.enum(['folder','video']),kind),parse(uuid,id),file.buffer);}
  @Delete('images/:kind/:id') removeImage(@Req()r:AuthRequest,@Param('kind')kind:string,@Param('id')id:string){this.s.admin(r.user);return this.s.image(parse(z.enum(['folder','video']),kind),parse(uuid,id));}
  @Get('images/:id') async imageFile(@Param('id')id:string,@Req()r:AuthRequest,@Res()res:Response){parse(uuid,id);await this.s.imageExists(id);await this.deliver(id,'webp',r,res,false);}
  @Get('uploads') uploads(@Req()r:AuthRequest){this.s.admin(r.user);return this.s.uploads(r.user.id);}
  @Post('uploads') start(@Req()r:AuthRequest,@Body()body:unknown){this.s.admin(r.user);return this.s.startUpload(r.user.id,parse(z.object({folderId:uuid.nullable(),title,description:description.default(''),filename:z.string().min(5).max(255).regex(/\.mp4$/i),bytes:z.number().int().positive().max(100*1024**3),lastModified:z.number().nonnegative(),fingerprint:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),body));}
  @Get('uploads/:id') upload(@Req()r:AuthRequest,@Param('id')id:string){this.s.admin(r.user);return this.s.upload(parse(uuid,id),r.user.id);}
  @Put('uploads/:id') chunk(@Req()r:AuthRequest,@Param('id')id:string){this.s.admin(r.user);if(r.headers['content-type']!=='application/octet-stream')throw new BadRequestException('Tipo de bloque inválido.');const offset=parse(z.coerce.number().int().nonnegative(),r.headers['upload-offset']);return this.s.chunk(parse(uuid,id),r.user.id,offset,Number(r.headers['content-length']),r);}
  @Delete('uploads/:id') cancel(@Req()r:AuthRequest,@Param('id')id:string){this.s.admin(r.user);return this.s.cancel(parse(uuid,id),r.user.id);}
  @Post('uploads/:id/finish') finish(@Req()r:AuthRequest,@Param('id')id:string){this.s.admin(r.user);return this.s.finish(parse(uuid,id),r.user.id);}
  @Patch(':id') edit(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){this.s.admin(r.user);return this.s.editVideo(parse(uuid,id),parse(z.object({title,description,folderId:uuid.nullable(),position,revision}).strict(),body));}
  @Delete(':id') remove(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){this.s.admin(r.user);const d=parse(z.object({confirm:z.literal('ELIMINAR'),revision}).strict(),body);return this.s.deleteVideo(parse(uuid,id),d.revision);}
  @Put(':id/progress') progress(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){const d=parse(z.object({seconds:z.number().finite().nonnegative(),completed:z.boolean().default(false),reset:z.boolean().default(false)}).strict(),body);return this.s.progress(r.user.id,parse(uuid,id),d.seconds,d.completed,d.reset);}
  @Put(':id/favorite') favorite(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){const d=parse(z.object({favorite:z.boolean()}).strict(),body);return this.s.favorite(r.user.id,parse(uuid,id),d.favorite);}
  @Get(':id/file') async file(@Req()r:AuthRequest,@Param('id')id:string,@Query('download')download:string|undefined,@Res()res:Response){parse(uuid,id);await this.s.video(id);if(download!==undefined&&download!=='1')throw new BadRequestException();if(download&&! (this.s.config.VIDEO_DOWNLOADS==='true'))throw new ForbiddenException('La descarga está desactivada.');await this.deliver(id,'mp4',r,res,!!download);}
  private async deliver(id:string,kind:'mp4'|'webp',r:AuthRequest,res:Response,download:boolean){
    let f;try{f=await open(this.s.storage.path(id,kind),constants.O_RDONLY|constants.O_NOFOLLOW);}catch{throw new NotFoundException('Archivo no disponible.');}const info=await f.stat();
    res.setHeader('Content-Type',kind==='mp4'?'video/mp4':'image/webp');res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Disposition',`${download?'attachment':'inline'}; filename="${id}.${kind}"`);
    if((this.s.config.VIDEO_DELIVERY??(this.s.config.NODE_ENV==='production'?'nginx':'node'))==='nginx'){
      await f.close();res.setHeader('X-Accel-Redirect',`/_private_videos/${kind==='mp4'?'media':'images'}/${id}.${kind}`);res.end();return;
    }
    const range=byteRange(r.headers.range,info.size);res.setHeader('Accept-Ranges','bytes');if(range==='invalid'){await f.close();res.status(416).setHeader('Content-Range',`bytes */${info.size}`);res.end();return;}
    if(range){res.status(206);res.setHeader('Content-Range',`bytes ${range.start}-${range.end}/${info.size}`);}res.setHeader('Content-Length',range?range.end-range.start+1:info.size);
    if(r.method==='HEAD'){await f.close();res.end();return;}try{await pipeline(f.createReadStream(range||{}),res);}catch{res.destroy();}finally{await f.close().catch(()=>{});}
  }
}
