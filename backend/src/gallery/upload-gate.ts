import { Injectable,NestInterceptor,ExecutionContext,CallHandler,HttpException } from '@nestjs/common';
import { finalize } from 'rxjs';
// Acquire before multipart buffering. One upload per API process; callers retry explicitly.
@Injectable()
export class PhotoUploadGate implements NestInterceptor {
  private busy=false;
  intercept(context:ExecutionContext,next:CallHandler){
    if(this.busy){context.switchToHttp().getResponse().setHeader('Retry-After','5');throw new HttpException('Se está procesando otra foto. Intenta nuevamente en unos segundos.',429);}
    this.busy=true;
    return next.handle().pipe(finalize(()=>{this.busy=false;}));
  }
}
