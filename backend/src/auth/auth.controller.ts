import { Controller,Get,Post,Body,Req,Res,Inject } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { AuthService,ownProfile } from './auth.service';
import { Public,AllowPasswordChange,AuthRequest } from './auth.guard';
import { CONFIG,Config } from '../common/config';
import { parse,slug,password } from '../common/validation';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth:AuthService,@Inject(CONFIG)private readonly c:Config){}
  private cookieOptions(){return {httpOnly:true,secure:this.c.COOKIE_SECURE,sameSite:'strict' as const,path:'/api'};}
  @Public() @Get('profiles') profiles(){return this.auth.profiles();}
  @Public() @Post('login') async login(@Body()body:unknown,@Req()r:AuthRequest,@Res({passthrough:true})res:Response){
    const b=parse(z.object({slug,password:z.string().min(1).max(128)}).strict(),body);
    const result=await this.auth.login(b.slug,b.password,r.ip||'unknown');
    res.cookie('space_session',result.token,{...this.cookieOptions(),maxAge:7*86400000});return result.user;
  }
  @AllowPasswordChange() @Get('me') me(@Req()r:AuthRequest){return ownProfile(r.user);}
  @AllowPasswordChange() @Post('logout') async logout(@Req()r:AuthRequest,@Res({passthrough:true})res:Response){await this.auth.logout(r.cookies.space_session);res.clearCookie('space_session',this.cookieOptions());return {ok:true};}
  @AllowPasswordChange() @Post('password') async password(@Body()body:unknown,@Req()r:AuthRequest,@Res({passthrough:true})res:Response){
    const b=parse(z.object({currentPassword:z.string().min(1).max(128),newPassword:password}).strict(),body);
    await this.auth.throttle('password',r.user.id,10,900000);
    await this.auth.changePassword(r.user.id,b.currentPassword,b.newPassword);res.clearCookie('space_session',this.cookieOptions());return {ok:true};
  }
  @Public() @Post('recovery') async recovery(@Body()body:unknown,@Req()r:AuthRequest){const b=parse(z.object({slug}).strict(),body);await this.auth.requestReset(b.slug,r.ip||'unknown');return {message:'Revisa el correo asociado a tu cuenta.'};}
  @Public() @Post('reset') async reset(@Body()body:unknown,@Req()r:AuthRequest){const b=parse(z.object({slug,code:z.string().regex(/^\d{6}$/),newPassword:password}).strict(),body);await this.auth.resetPassword(b.slug,b.code,b.newPassword,r.ip||'unknown');return {ok:true};}
}
