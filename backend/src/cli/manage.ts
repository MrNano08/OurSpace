import 'reflect-metadata';
import { randomUUID,randomBytes } from 'node:crypto';
import { DataSource } from 'typeorm';
import { readConfig,Config } from '../common/config';
import { createDataSource,locked } from '../database/data-source';
import { User,Session,PasswordReset,AuthThrottle } from '../database/entities';
import { hashPassword,tokenHash } from '../common/security';

export async function seed(db:DataSource,c:Config){
  const users=[{slug:'ronaldo',name:'Ronaldo',email:c.RONALDO_EMAIL,accent:'sage',password:process.env.RONALDO_INITIAL_PASSWORD},{slug:'scarlet',name:'Scarlet',email:c.SCARLET_EMAIL,accent:'rose',password:process.env.SCARLET_INITIAL_PASSWORD}];
  for(const u of users){if(await db.getRepository(User).existsBy({slug:u.slug}))continue;if(!u.password||u.password.length<4||u.password.length>128)throw new Error(`Define ${u.slug.toUpperCase()}_INITIAL_PASSWORD (4–128 caracteres) antes del seed.`);}
  await db.transaction(async em=>{for(const u of users){if(await em.existsBy(User,{slug:u.slug}))continue;await em.save(User,{id:randomUUID(),slug:u.slug,name:u.name,email:u.email,accent:u.accent,passwordHash:await hashPassword(u.password!),mustChangePassword:true,failedLogins:0,lockedUntil:0,createdAt:Date.now()});}});
}
export async function resetUser(db:DataSource,slug:string){
  const temporary=randomBytes(18).toString('base64url');const hash=await hashPassword(temporary);
  await db.transaction(async em=>{const u=await locked(em,User,'u').where('u.slug = :slug',{slug}).getOne();if(!u)throw new Error('Usuario no encontrado.');u.passwordHash=hash;u.mustChangePassword=true;u.failedLogins=0;u.lockedUntil=0;await em.save(u);await em.delete(Session,{userId:u.id});await em.delete(PasswordReset,{userId:u.id});});return temporary;
}
async function main(){
  const [command,slug]=process.argv.slice(2);if(!['migrate','seed','list','reset','unlock'].includes(command))throw new Error('Comando inválido.');
  if(['reset','unlock'].includes(command)&&!['ronaldo','scarlet'].includes(slug))throw new Error('Indica ronaldo o scarlet.');
  const c=readConfig();const db=await createDataSource(c).initialize();
  try{
    if(command==='migrate'){await db.runMigrations();console.log('Migraciones aplicadas.');}
    if(command==='seed'){await seed(db,c);console.log('Usuarios preparados. Las cuentas existentes no fueron modificadas.');}
    if(command==='list'){for(const u of await db.getRepository(User).find())console.log(`${u.slug}\t${u.name}\t${u.email.slice(0,2)}***@${u.email.split('@')[1]}\t${u.lockedUntil>Date.now()?'bloqueada':'activa'}\t${u.mustChangePassword?'cambio de contraseña pendiente':''}`);}
    if(command==='reset'){const temporary=await resetUser(db,slug);console.log(`Usuario: ${slug}\nContraseña temporal: ${temporary}\nSesiones invalidadas. Debe cambiarla al entrar. No guardes esta salida en registros.`);}
    if(command==='unlock'){
      const r=await db.getRepository(User).update({slug},{failedLogins:0,lockedUntil:0});if(!r.affected)throw new Error('Usuario no encontrado.');
      await db.getRepository(AuthThrottle).delete({key:'reset-user:'+tokenHash(slug)});console.log('Cuenta desbloqueada. El límite temporal por dirección IP se mantiene.');
    }
  }finally{await db.destroy();}
}
if(require.main===module)void main().catch(e=>{console.error(e instanceof Error?e.message:'No se pudo ejecutar el comando.');process.exitCode=1;});
