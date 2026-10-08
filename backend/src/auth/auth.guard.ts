import { CanActivate,ExecutionContext,Injectable,Inject,SetMetadata,UnauthorizedException,ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '../database/entities';
import { AuthService } from './auth.service';
import { CONFIG,Config } from '../common/config';
export const Public=()=>SetMetadata('public',true);
export const AllowPasswordChange=()=>SetMetadata('allowPasswordChange',true);
export type AuthRequest=Request&{user:User};
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth:AuthService,private readonly reflector:Reflector,@Inject(CONFIG)private readonly c:Config){}
  async canActivate(ctx:ExecutionContext){
    const req=ctx.switchToHttp().getRequest<AuthRequest>();
    if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin!==this.c.WEB_ORIGIN)throw new ForbiddenException('Origen de la solicitud no permitido.');
    if(this.reflector.getAllAndOverride('public',[ctx.getHandler(),ctx.getClass()]))return true;
    const user=await this.auth.session(req.cookies?.space_session);
    if(!user)throw new UnauthorizedException('Inicia sesión para continuar.');
    req.user=user;
    if(user.mustChangePassword&&!this.reflector.getAllAndOverride('allowPasswordChange',[ctx.getHandler(),ctx.getClass()]))throw new ForbiddenException('Debes cambiar tu contraseña temporal.');
    return true;
  }
}
