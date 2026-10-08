import { randomBytes,scrypt as nativeScrypt,timingSafeEqual,createHash,createHmac } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(nativeScrypt);
export const tokenHash=(v:string)=>createHash('sha256').update(v).digest('hex');
export const codeHash=(secret:string,userId:string,code:string)=>createHmac('sha256',secret).update(userId+':'+code).digest('hex');
export const newToken=()=>randomBytes(32).toString('base64url');
export async function hashPassword(password:string){const salt=randomBytes(16).toString('hex'); const key=await scrypt(password,salt,64) as Buffer;return `scrypt:${salt}:${key.toString('hex')}`;}
export async function verifyPassword(password:string,hash:string){const [kind,salt,key]=hash.split(':');if(kind!=='scrypt'||!salt||!key)return false;const a=Buffer.from(key,'hex');const b=await scrypt(password,salt,64) as Buffer;return a.length===b.length&&timingSafeEqual(a,b);}
