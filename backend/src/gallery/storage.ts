import { Injectable,Inject,BadRequestException,ServiceUnavailableException } from '@nestjs/common';
import { mkdir,writeFile,rename,rm,statfs,readdir,stat,open } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import sharp,{type Metadata,type OutputInfo} from 'sharp';
import { CONFIG,Config } from '../common/config';
import { extractCapture } from './metadata';
sharp.concurrency(1);sharp.cache({memory:32,files:0,items:20});
export const MAX_PHOTO_BYTES=20*1024*1024;
@Injectable()
export class PhotoStorage {
  readonly root:string;
  constructor(@Inject(CONFIG)c:Config){this.root=resolve(c.PHOTO_STORAGE_DIR||'storage/gallery');}
  dir(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('Invalid storage id');return join(this.root,id);}
  async prepare(id:string,buffer:Buffer,keepOriginal=true){
    if(buffer.length>MAX_PHOTO_BYTES)throw new BadRequestException('La foto supera 20 MiB.');
    let meta:Metadata;
    try{meta=await sharp(buffer,{limitInputPixels:40000000,failOn:'warning'}).metadata();}catch{throw new BadRequestException('No se pudo leer la foto. Usa JPEG, PNG o WebP de hasta 40 megapíxeles.');}
    if(!['jpeg','png','webp'].includes(meta.format||'')||(meta.pages||1)>1||!meta.width||!meta.height)throw new BadRequestException('Solo se admiten fotos JPEG, PNG y WebP sin animación.');
    await mkdir(this.root,{recursive:true,mode:0o700});
    const disk=await statfs(this.root);if(disk.bavail*disk.bsize<buffer.length*3+100*1024*1024)throw new ServiceUnavailableException('No hay espacio suficiente para guardar la foto.');
    const temp=join(this.root,'.tmp-'+id);await mkdir(temp,{mode:0o700});
    try{
      if(keepOriginal)await writeFile(join(temp,'original'),buffer,{mode:0o600,flag:'wx'});
      let info:OutputInfo;
      try{
        info=await sharp(buffer,{limitInputPixels:40000000,failOn:'warning'}).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(join(temp,'medium.webp'));
        await sharp(join(temp,'medium.webp')).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:78}).toFile(join(temp,'thumb.webp'));
      }catch{throw new BadRequestException('La imagen está dañada o no puede procesarse.');}
      const capture=await extractCapture(buffer);
      const swap=meta.orientation!==undefined&&meta.orientation>=5;
      await rename(temp,this.dir(id));
      return {format:meta.format!,width:swap?meta.height:meta.width,height:swap?meta.width:meta.height,bytes:buffer.length,capture,previewWidth:info.width};
    }catch(e){await rm(temp,{recursive:true,force:true});throw e;}
  }
  async remove(id:string){await rm(this.dir(id),{recursive:true,force:true});}
  async file(id:string,variant:string){
    const filename=variant==='original'?'original':variant==='thumb'?'thumb.webp':'medium.webp';
    return open(join(this.dir(id),filename),'r');
  }
  async cleanOrphans(known:Set<string>){
    await mkdir(this.root,{recursive:true,mode:0o700});
    for(const entry of await readdir(this.root,{withFileTypes:true})){
      if(!entry.isDirectory()||! /^(\.tmp-)?[a-f0-9-]{36}$/.test(entry.name)||known.has(entry.name))continue;
      const path=join(this.root,entry.name);const s=await stat(path);
      if(s.mtimeMs<Date.now()-86400000)await rm(path,{recursive:true,force:true});
    }
  }
}
