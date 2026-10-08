import { BadRequestException,Inject,Injectable,ServiceUnavailableException } from '@nestjs/common';
import { constants,createReadStream } from 'node:fs';
import { mkdir,open,statfs,stat,rm,chmod } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { CONFIG,Config } from '../common/config';
const exec=promisify(execFile);
export const CHUNK=8*1024*1024;
@Injectable()
export class VideoStorage {
  readonly root:string;
  constructor(@Inject(CONFIG)private readonly config:Config){this.root=resolve(config.VIDEO_STORAGE_DIR||join(config.PHOTO_STORAGE_DIR||'storage/gallery','../videos'));}
  path(id:string,kind:'mp4'|'part'|'webp'){if(!/^[0-9a-f-]{36}$/.test(id))throw new BadRequestException('Identificador inválido.');return join(this.root,kind==='part'?'partial':kind==='webp'?'images':'media',`${id}.${kind}`);}
  async init(){for(const sub of ['', 'media','images','partial'])await mkdir(join(this.root,sub),{recursive:true,mode:sub==='partial'?0o700:0o750});}
  async free(){await this.init();const d=await statfs(this.root);return {total:d.blocks*d.bsize,available:d.bavail*d.bsize};}
  async space(bytes:number){const d=await this.free();if(d.available-bytes<(this.config.VIDEO_RESERVE_BYTES??1024**3))throw new BadRequestException('No hay suficiente espacio libre. Se conserva una reserva para el servidor.');}
  async remove(id:string,kind:'mp4'|'part'|'webp'){await rm(this.path(id,kind),{force:true});}
  async image(id:string,buffer:Buffer){
    await this.init();try{
      const input=sharp(buffer,{limitInputPixels:40_000_000,failOn:'error'});const info=await input.metadata();if(!['jpeg','png','webp'].includes(info.format||''))throw new Error();
      await input.rotate().resize(960,540,{fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(this.path(id,'webp'));await chmod(this.path(id,'webp'),0o640);
    }catch{await this.remove(id,'webp');throw new BadRequestException('Usa una imagen JPEG, PNG o WebP válida (máximo 8 MiB y 40 megapíxeles).');}
  }
  async inspect(id:string){
    const path=this.path(id,'part');const bytes=(await stat(path)).size;
    // Walk top-level MP4 atoms without reading payloads into memory.
    const f=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW);let pos=0,moov=false,mdat=false,ftyp=false,atoms=0;
    try{while(pos+8<=bytes){if(++atoms>100000)throw new Error();const h=Buffer.alloc(16);const {bytesRead}=await f.read(h,0,16,pos);if(bytesRead<8)throw new Error();const type=h.toString('ascii',4,8);let size=h.readUInt32BE(0),header=8;
      if(size===1){if(bytesRead<16)throw new Error();const big=h.readBigUInt64BE(8);if(big>BigInt(Number.MAX_SAFE_INTEGER))throw new Error();size=Number(big);header=16;}else if(size===0)size=bytes-pos;
      if(size<header||pos+size>bytes)throw new Error();if(pos===0){if(type!=='ftyp')throw new Error();ftyp=true;}if(type==='moov')moov=true;if(type==='mdat'){if(!moov)throw new BadRequestException('El MP4 no está preparado para faststart. Prepara una copia antes de subirlo; consulta VIDEOS.md.');mdat=true;}pos+=size;
    }if(!ftyp||!moov||!mdat||pos!==bytes)throw new Error();}catch(e){if(e instanceof BadRequestException)throw e;throw new BadRequestException('El archivo no es un MP4 completo válido.');}finally{await f.close();}
    let data:any;try{const r=await exec('ffprobe',['-v','error','-protocol_whitelist','file','-show_entries','format=duration:stream=codec_type,codec_name,width,height','-of','json',path],{timeout:60000,maxBuffer:1024*1024});data=JSON.parse(r.stdout);}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')throw new ServiceUnavailableException('Falta ffprobe en el servidor. Instala el paquete ffmpeg de Debian.');throw new BadRequestException('No se pudo validar el video con ffprobe.');}
    const streams=data.streams||[],videos=streams.filter((s:any)=>s.codec_type==='video'),audios=streams.filter((s:any)=>s.codec_type==='audio');
    const duration=Number(data.format?.duration);if(videos.length!==1||videos[0].codec_name!=='h264'||audios.some((s:any)=>s.codec_name!=='aac')||!Number.isFinite(duration)||duration<=0)throw new BadRequestException('Usa MP4 con un video H.264 y audio AAC (o sin audio).');
    const hash=createHash('sha256');for await(const chunk of createReadStream(path))hash.update(chunk);
    return {duration,bytes,sha256:hash.digest('hex')};
  }
}
export function byteRange(value:string|undefined,size:number):{start:number;end:number}|null|'invalid'{
  if(!value)return null;const m=/^bytes=(\d*)-(\d*)$/.exec(value);if(!m||!m[1]&&!m[2])return 'invalid';
  let start:number,end:number;if(!m[1]){const suffix=Number(m[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return 'invalid';start=Math.max(0,size-suffix);end=size-1;}else{start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),size-1):size-1;}
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)return 'invalid';return {start,end};
}
