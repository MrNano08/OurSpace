import { Injectable,Inject,UnauthorizedException,HttpException,BadRequestException,ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { randomInt,timingSafeEqual } from 'node:crypto';
import { User,Session,PasswordReset,AuthThrottle } from '../database/entities';
import { locked } from '../database/data-source';
import { hashPassword,verifyPassword,newToken,tokenHash,codeHash } from '../common/security';
import { CONFIG,Config } from '../common/config';
import { MailService } from '../mail/mail.service';
export const publicProfile=(u:User)=>({id:u.id,slug:u.slug,name:u.name,accent:u.accent});
export const ownProfile=(u:User)=>({...publicProfile(u),avatarId:u.avatarId,email:u.email,mustChangePassword:u.mustChangePassword});

@Injectable()
export class AuthService {
  constructor(private readonly db:DataSource,@Inject(CONFIG)private readonly c:Config,private readonly mail:MailService){}
  async throttle(scope:string,input:string,max:number,windowMs:number){
    const key=scope+':'+tokenHash(input); const now=Date.now();
    const denied=await this.db.transaction(async em=>{
      await em.createQueryBuilder().insert().into(AuthThrottle).values({key,count:0,expiresAt:now+windowMs}).orIgnore().execute();
      const r=await locked(em,AuthThrottle,'t').where('t.key = :key',{key}).getOneOrFail();
      if(r.expiresAt<=now){r.count=0;r.expiresAt=now+windowMs;}
      if(r.count>=max)return true;
      r.count++; await em.save(r);return false;
    });
    if(denied)throw new HttpException('Demasiados intentos. Espera unos minutos.',429);
  }
  async profiles(){return (await this.db.getRepository(User).find({order:{slug:'ASC'}})).map(publicProfile);}
  async login(slug:string,password:string,ip:string){
    await this.throttle('login',ip,30,15*60000);
    const result=await this.db.transaction(async em=>{
      const user=await locked(em,User,'u').where('u.slug = :slug',{slug}).getOne();
      if(!user||user.lockedUntil>Date.now())return null;
      if(!(await verifyPassword(password,user.passwordHash))){
        user.failedLogins++;
        if(user.failedLogins>=5){user.lockedUntil=Date.now()+15*60000;user.failedLogins=0;}
        await em.save(user);return null;
      }
      user.failedLogins=0;user.lockedUntil=0;await em.save(user);
      const token=newToken();await em.save(Session,{tokenHash:tokenHash(token),userId:user.id,expiresAt:Date.now()+7*86400000});
      return {token,user:ownProfile(user)};
    });
    if(!result)throw new UnauthorizedException('No se pudo iniciar sesión. Revisa la contraseña o espera si hubo varios intentos.');
    return result;
  }
  async session(token:string|undefined){
    if(!token||token.length>100)return null;
    const s=await this.db.getRepository(Session).findOneBy({tokenHash:tokenHash(token)});
    if(!s||s.expiresAt<=Date.now())return null;
    return this.db.getRepository(User).findOneBy({id:s.userId});
  }
  async logout(token:string){await this.db.getRepository(Session).delete({tokenHash:tokenHash(token)});}
  async changePassword(userId:string,current:string,next:string){
    if(current===next)throw new BadRequestException('Elige una contraseña diferente de la actual.');
    const hash=await hashPassword(next);
    await this.db.transaction(async em=>{
      const u=await locked(em,User,'u').where('u.id = :id',{id:userId}).getOneOrFail();
      if(!(await verifyPassword(current,u.passwordHash)))throw new UnauthorizedException('La contraseña actual no coincide.');
      u.passwordHash=hash;u.mustChangePassword=false;u.failedLogins=0;u.lockedUntil=0;
      await em.save(u);await em.delete(Session,{userId});await em.delete(PasswordReset,{userId});
    });
  }
  async requestReset(slug:string,ip:string){
    await this.throttle('reset-ip',ip,10,3600000);
    await this.throttle('reset-user',slug,3,3600000);
    if(!this.mail.available())throw new ServiceUnavailableException('La recuperación por correo aún no está configurada. Usa el script de emergencia del servidor.');
    const u=await this.db.getRepository(User).findOneBy({slug});
    if(!u)return;
    const code=String(randomInt(0,1000000)).padStart(6,'0');const hash=codeHash(this.c.AUTH_SECRET,u.id,code);
    await this.db.transaction(async em=>{
      await locked(em,User,'u').where('u.id = :id',{id:u.id}).getOneOrFail();
      const old=await em.findOneBy(PasswordReset,{userId:u.id});
      if(old&&Date.now()-old.createdAt<60000)throw new HttpException('Espera un minuto antes de solicitar otro código.',429);
      await em.save(PasswordReset,{userId:u.id,codeHash:hash,attempts:0,createdAt:Date.now(),expiresAt:Date.now()+600000});
    });
    try{await this.mail.sendReset(u.email,code);}catch(e){await this.db.getRepository(PasswordReset).delete({userId:u.id,codeHash:hash});throw e;}
  }
  async resetPassword(slug:string,code:string,next:string,ip:string){
    await this.throttle('reset-verify',ip,20,15*60000);
    const success=await this.db.transaction(async em=>{
      const u=await locked(em,User,'u').where('u.slug = :slug',{slug}).getOne();if(!u)return false;
      const reset=await em.findOneBy(PasswordReset,{userId:u.id});
      if(!reset||reset.attempts>=5||reset.expiresAt<=Date.now())return false;
      const supplied=Buffer.from(codeHash(this.c.AUTH_SECRET,u.id,code),'hex');
      if(!timingSafeEqual(supplied,Buffer.from(reset.codeHash,'hex'))){reset.attempts++;await em.save(reset);return false;}
      u.passwordHash=await hashPassword(next);u.mustChangePassword=false;u.failedLogins=0;u.lockedUntil=0;
      await em.save(u);await em.delete(Session,{userId:u.id});await em.delete(PasswordReset,{userId:u.id});return true;
    });
    if(!success)throw new BadRequestException('Código incorrecto, vencido o agotado. Solicita uno nuevo si es necesario.');
  }
}
