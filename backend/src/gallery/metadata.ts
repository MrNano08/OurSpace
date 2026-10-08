import { z } from 'zod';
import * as exifr from 'exifr';
// A camera wall time is not an instant. Never infer a zone, filename date or lastModified.
export function validCameraDate(value:string){
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(value))return false;
  const n=Date.parse(value+'Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,19)===value&&value>='1900-01-01T00:00:00'&&value<='2099-12-31T23:59:59';
}
export const metadataFields={
  description:z.string().trim().max(2000),location:z.string().trim().max(200),album:z.string().trim().max(80),
  tags:z.array(z.string().trim().min(1).max(40)).max(10).transform(v=>[...new Set(v)]),
  capturedAt:z.string().refine(validCameraDate,'Fecha de captura inválida').nullable()
};
export const metadataSchema=z.object(metadataFields).strict();
export const uploadSchema=z.object({
  description:metadataFields.description.default(''),location:metadataFields.location.default(''),album:metadataFields.album.default(''),tags:metadataFields.tags.default([]),
  capturedAt:metadataFields.capturedAt.optional(),password:z.string().min(4).max(128).nullable().default(null),
  unlockAt:z.number().int().min(0).max(4102444800000).nullable().default(null)
}).strict();
export async function extractCapture(buffer:Buffer):Promise<{date:string|null;offset:string|null}>{
  try{
    const meta=await exifr.parse(buffer,{pick:['DateTimeOriginal','OffsetTimeOriginal'],reviveValues:false,gps:false,xmp:false,icc:false,iptc:false});
    const raw=meta?.DateTimeOriginal;
    const normalized=typeof raw==='string'?raw.trim().replace(/^(\d{4}):(\d{2}):(\d{2})[ T]/,'$1-$2-$3T'):'';
    const date=validCameraDate(normalized)?normalized:null;
    const off=meta?.OffsetTimeOriginal;
    const offset=date&&typeof off==='string'&&/^[+-](0\d|1[0-4]):[0-5]\d$/.test(off)?off:null;
    return {date,offset};
  }catch{return {date:null,offset:null};}
}
