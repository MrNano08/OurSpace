import 'dotenv/config';
import { z } from 'zod';
import { isAbsolute } from 'node:path';

const schema = z.object({
  NODE_ENV:z.enum(['development','production','test']).default('development'),
  PORT:z.coerce.number().int().min(1).max(65535).default(3000), HOST:z.string().default('127.0.0.1'),
  WEB_ORIGIN:z.url().default('http://localhost:5173'), COOKIE_SECURE:z.enum(['true','false']).default('false').transform(v=>v==='true'),
  DB_HOST:z.string().default('127.0.0.1'),DB_PORT:z.coerce.number().int().default(3306),
  DB_USERNAME:z.string().min(1),DB_PASSWORD:z.string().min(1),DB_DATABASE:z.string().min(1),
  AUTH_SECRET:z.string().min(32).refine(v=>!v.includes('REEMPLAZAR'),'Genera AUTH_SECRET aleatorio'),
  RONALDO_EMAIL:z.email().default('ronaldomoradiaz08@gmail.com'),SCARLET_EMAIL:z.email().default('scarreyesg22@gmail.com'),
  VIDEO_STORAGE_DIR:z.string().min(1).optional(),
  VIDEO_ADMIN_SLUGS:z.string().regex(/^(ronaldo|scarlet)(,(ronaldo|scarlet))*$/).optional(),
  VIDEO_MAX_BYTES:z.coerce.number().int().min(1048576).max(100*1024**3).optional(),
  VIDEO_DOWNLOADS:z.enum(['true','false']).optional(),
  VIDEO_DELIVERY:z.enum(['nginx','node']).optional(),
  VIDEO_RESERVE_BYTES:z.coerce.number().int().min(0).optional(),
  PHOTO_STORAGE_DIR:z.string().min(1).optional(),
  MAIL_USER:z.string().default(''),MAIL_APP_PASSWORD:z.string().default(''),MAIL_FROM:z.string().default('')
}).superRefine((v,ctx)=>{
  if(new URL(v.WEB_ORIGIN).origin!==v.WEB_ORIGIN) ctx.addIssue({code:'custom',path:['WEB_ORIGIN'],message:'Usa solo el origen, sin ruta ni barra final'});
  if(v.VIDEO_STORAGE_DIR&&!isAbsolute(v.VIDEO_STORAGE_DIR))ctx.addIssue({code:'custom',path:['VIDEO_STORAGE_DIR'],message:'Usa una ruta absoluta privada para los videos'});
  if(v.NODE_ENV==='production'&&(!v.PHOTO_STORAGE_DIR||!isAbsolute(v.PHOTO_STORAGE_DIR)))ctx.addIssue({code:'custom',path:['PHOTO_STORAGE_DIR'],message:'Producción exige una ruta absoluta persistente para las fotos'});
  if(v.NODE_ENV==='production'&&(!v.COOKIE_SECURE||!v.WEB_ORIGIN.startsWith('https://')))ctx.addIssue({code:'custom',message:'Producción exige HTTPS y COOKIE_SECURE=true'});
});
export type Config=z.infer<typeof schema>;
export const CONFIG=Symbol('CONFIG');
export function readConfig():Config { const result=schema.safeParse(process.env); if(!result.success)throw new Error('Configuración inválida: '+result.error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')); return result.data; }
