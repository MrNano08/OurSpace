import { Controller,Get,Post,Put,Delete,Body,Param,Query,Req,Res,BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import { parse,uuid } from '../common/validation';
import { AuthRequest } from '../auth/auth.guard';
import { byteRange } from '../videos/storage';
import { MangasService } from './mangas.service';
const text=z.string().trim().min(1).max(120),rev=z.number().int().positive(),position=z.number().int().min(1).max(10000);
export const links=z.array(z.string().max(2048).url().refine(s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&u.href.length<=2048;}catch{return false;}},'Usa enlaces HTTP/HTTPS sin credenciales.')).max(5);
const book=z.object({title:z.string().trim().min(1).max(160),description:z.string().max(3000),category:z.enum(['manga','manhwa','manhua','otro']),links});
const confirmed=z.object({revision:rev,confirm:z.literal('ELIMINAR')}).strict();
@Controller('mangas')
export class MangasController {
 constructor(private s:MangasService){}
 private user(r:AuthRequest){this.s.access(r.user);return r.user;}
 @Get('capabilities') caps(){return {enabled:this.s.enabled(),pdfMaxBytes:this.s.config.MANGA_PDF_MAX_BYTES??100*1024**2};}
 @Get() list(@Req()r:AuthRequest){return this.s.catalog(this.user(r));}
 @Post() create(@Req()r:AuthRequest,@Body()body:unknown){return this.s.create(this.user(r),parse(book.strict(),body));}
 @Get('notes') notes(@Req()r:AuthRequest,@Query('mangaId')id?:string){return this.s.notes(this.user(r),id?parse(uuid,id):null);}
 @Put('notes/:id') note(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.note(this.user(r),parse(uuid,id),parse(z.object({mangaId:uuid.nullable(),title:text,body:z.string().max(6000),revision:z.number().int().nonnegative()}).strict(),body));}
 @Delete('notes/:id') deleteNote(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.removeNote(this.user(r),parse(uuid,id),parse(confirmed,body).revision);}
 @Get('chapters/:id') reader(@Req()r:AuthRequest,@Param('id')id:string){return this.s.reader(this.user(r),parse(uuid,id));}
 @Put('chapters/:id/progress') progress(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.progress(this.user(r),parse(uuid,id),parse(z.object({page:z.number().int().min(1).max(2000),assetId:uuid.nullable(),offset:z.number().min(0).max(1)}).strict(),body));}
 @Get('assets/:id/file') async file(@Req()r:AuthRequest,@Param('id')id:string,@Res()res:Response){this.user(r);const a=await this.s.asset(parse(uuid,id)),ext=a.kind==='pdf'?'pdf':'webp';const f=await open(this.s.storage.path(id,ext),constants.O_RDONLY|constants.O_NOFOLLOW);const size=(await f.stat()).size;res.set({'Content-Type':ext==='pdf'?'application/pdf':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'",'Content-Disposition':`${ext==='pdf'?'attachment':'inline'}; filename="${id}.${ext}"`});
  if(this.s.config.MANGA_DELIVERY==='nginx'){await f.close();res.setHeader('X-Accel-Redirect',`/_private_mangas/${id}.${ext}`);res.end();return;}
  const range=byteRange(r.headers.range,size);res.setHeader('Accept-Ranges','bytes');if(range==='invalid'){await f.close();res.status(416).setHeader('Content-Range',`bytes */${size}`);res.end();return;}if(range){res.status(206).setHeader('Content-Range',`bytes ${range.start}-${range.end}/${size}`);}res.setHeader('Content-Length',range?range.end-range.start+1:size);if(r.method==='HEAD'){await f.close();res.end();return;}try{await pipeline(f.createReadStream(range||{}),res);}catch{res.destroy();}finally{await f.close().catch(()=>{});}
 }
 @Get(':id') detail(@Req()r:AuthRequest,@Param('id')id:string){return this.s.detail(this.user(r),parse(uuid,id));}
 @Put(':id') update(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.update(this.user(r),parse(uuid,id),parse(book.extend({revision:rev,coverId:uuid.nullable()}).strict(),body));}
 @Delete(':id') remove(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.remove(this.user(r),parse(uuid,id),parse(confirmed,body).revision);}
 @Put(':id/preference') preference(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.preference(this.user(r),parse(uuid,id),parse(z.object({status:z.enum(['pendiente','leyendo','terminado','favorito'])}).strict(),body).status);}
 @Post(':id/volumes') volume(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.volume(this.user(r),parse(uuid,id),parse(z.object({id:uuid.optional(),title:text,position,revision:rev}).strict(),body));}
 @Delete(':id/volumes/:volumeId') removeVolume(@Req()r:AuthRequest,@Param('id')id:string,@Param('volumeId')vid:string,@Body()body:unknown){return this.s.removeVolume(this.user(r),parse(uuid,id),parse(uuid,vid),parse(confirmed,body).revision);}
 @Post(':id/chapters') chapter(@Req()r:AuthRequest,@Param('id')id:string,@Body()body:unknown){return this.s.chapter(this.user(r),parse(uuid,id),parse(z.object({id:uuid.optional(),title:text,volumeId:uuid.nullable(),position,kind:z.enum(['images','pdf','link']),assets:z.array(uuid).max(500),links,revision:rev}).strict(),body));}
 @Delete(':id/chapters/:chapterId') removeChapter(@Req()r:AuthRequest,@Param('id')id:string,@Param('chapterId')cid:string,@Body()body:unknown){return this.s.removeChapter(this.user(r),parse(uuid,id),parse(uuid,cid),parse(confirmed,body).revision);}
 @Put(':id/uploads/:assetId') upload(@Req()r:AuthRequest,@Param('id')id:string,@Param('assetId')aid:string,@Query()query:unknown){const u=this.user(r);r.setTimeout(120000,()=>r.destroy());if(r.headers['content-type']!=='application/octet-stream')throw new BadRequestException();const d=parse(z.object({kind:z.enum(['image','pdf','cover']),filename:z.string().min(1).max(255)}).strict(),query);return this.s.upload(u,parse(uuid,id),parse(uuid,aid),d.kind,d.filename,Number(r.headers['content-length']),r);}
}
