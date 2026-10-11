import { Inject,Injectable,BadRequestException,ServiceUnavailableException } from '@nestjs/common';
import { CONFIG,Config } from '../common/config';
import { mkdir,open,statfs,rm,stat,chmod } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join,resolve } from 'node:path';
import { Readable } from 'node:stream';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
const exec=promisify(execFile);
@Injectable()
export class MangaStorage {
 readonly root:string;
 constructor(@Inject(CONFIG)readonly config:Config){this.root=resolve(config.MANGA_STORAGE_DIR||join(config.PHOTO_STORAGE_DIR||'storage/gallery','../mangas'));}
 path(id:string,ext:'part'|'pdf'|'webp'){if(!/^[0-9a-f-]{36}$/.test(id))throw new BadRequestException();return join(this.root,`${id}.${ext}`);}
 async init(){await mkdir(this.root,{recursive:true,mode:0o750});}
 async remove(id:string){await Promise.all(['part','pdf','webp'].map(ext=>rm(this.path(id,ext as any),{force:true})));}
 async receive(id:string,kind:string,length:number,input:Readable){
  const limit=kind==='pdf'?(this.config.MANGA_PDF_MAX_BYTES??100*1024**2):20*1024**2;
  if(!Number.isSafeInteger(length)||length<1||length>limit)throw new BadRequestException(`Archivo demasiado grande (máximo ${Math.round(limit/1024**2)} MiB).`);
  await this.init();const disk=await statfs(this.root);if(disk.bavail*disk.bsize<length*3+1024**3)throw new BadRequestException('Espacio insuficiente; se conserva 1 GiB de reserva.');
  const f=await open(this.path(id,'part'),'wx',0o600);let bytes=0;
  try{for await(const raw of input){const b=Buffer.from(raw);bytes+=b.length;if(bytes>length)throw new BadRequestException('Tamaño inválido.');let at=0;while(at<b.length){const r=await f.write(b,at,b.length-at);at+=r.bytesWritten;}}if(bytes!==length)throw new BadRequestException('Subida incompleta.');await f.sync();}finally{await f.close();}
  if(kind==='pdf')return this.pdf(id);
  try{const source=sharp(this.path(id,'part'),{limitInputPixels:32_000_000,failOn:'error',animated:false});const meta=await source.metadata();if(!['jpeg','png','webp'].includes(meta.format||'')||(meta.pages??1)>1)throw new Error();
   const output=source.rotate();if(kind==='cover')output.resize(480,720,{fit:'inside',withoutEnlargement:true});else output.resize(1920,12000,{fit:'inside',withoutEnlargement:true});
   const result=await output.webp(kind==='cover'?{quality:85,effort:3}:{lossless:true,effort:2}).toFile(this.path(id,'webp'));await chmod(this.path(id,'webp'),0o640);await rm(this.path(id,'part'));
   return {kind:kind==='cover'?'cover':'image',pages:1,width:result.width,height:result.height,bytes:result.size};
  }catch{throw new BadRequestException('Usa JPG, JPEG, PNG o WebP estático válido, máximo 32 megapíxeles.');}
 }
 private async pdf(id:string){
  const f=await open(this.path(id,'part'),constants.O_RDONLY|constants.O_NOFOLLOW);const h=Buffer.alloc(5);try{await f.read(h,0,5,0);}finally{await f.close();}if(h.toString()!=='%PDF-')throw new BadRequestException('No es un PDF válido.');
  let output:string;try{const result=await exec('prlimit',['--as=536870912','--cpu=15','--','pdfinfo',this.path(id,'part')],{timeout:20000,killSignal:'SIGKILL',maxBuffer:256*1024,env:{...process.env,LC_ALL:'C'}});output=result.stdout;}catch(e){if((e as any).code==='ENOENT'||(e as any).code===127)throw new ServiceUnavailableException('La lectura de PDF requiere pdfinfo (poppler-utils) y prlimit en el servidor.');throw new BadRequestException('PDF inválido, protegido o demasiado complejo. No se publicó.');}
  const pages=Number(/^Pages:\s+(\d+)/m.exec(output)?.[1]);if(!pages||pages>2000||/^Encrypted:\s+yes/m.test(output))throw new BadRequestException('Usa PDF sin contraseña y de hasta 2000 páginas.');
  const {rename}=await import('node:fs/promises');await rename(this.path(id,'part'),this.path(id,'pdf'));await chmod(this.path(id,'pdf'),0o640);return {kind:'pdf',pages,width:0,height:0,bytes:(await stat(this.path(id,'pdf'))).size};
 }
}
