import { Controller,Get,Post,Body,Query,Req,Res } from '@nestjs/common';
import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../auth/auth.guard';
import { parse,uuid } from '../../common/validation';
import { TogetherService } from './together.service';
import { requireCouple } from './room';
const identity=z.object({sessionId:uuid,clientId:uuid});
@Controller('videos/together')
export class TogetherController {
  constructor(private s:TogetherService){}
  @Post('join') join(@Req()r:AuthRequest,@Body()body:unknown){requireCouple(r.user.slug);const d=parse(z.object({clientId:uuid,videoId:uuid,position:z.number().finite().nonnegative(),paused:z.boolean()}).strict(),body);return this.s.join(r.user.id,d.clientId,d.videoId,d.position,d.paused);}
  @Post('command') command(@Req()r:AuthRequest,@Body()body:unknown){requireCouple(r.user.slug);const d=parse(identity.extend({seq:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),baseVersion:z.number().int().positive(),position:z.number().finite().nonnegative(),paused:z.boolean()}).strict(),body);return this.s.get(d.sessionId).command(r.user.id,d);}
  // Heartbeat also revalidates the existing auth cookie through AuthGuard. No room DB writes.
  @Post('pulse') pulse(@Req()r:AuthRequest,@Body()body:unknown){requireCouple(r.user.slug);const d=parse(identity.extend({ready:z.boolean()}).strict(),body);return this.s.get(d.sessionId).pulse(r.user.id,d.clientId,d.ready);}
  @Post('leave') leave(@Req()r:AuthRequest,@Body()body:unknown){requireCouple(r.user.slug);const d=parse(identity.strict(),body);return this.s.get(d.sessionId).leave(r.user.id,d.clientId);}
  @Get('events') events(@Req()r:AuthRequest,@Query()query:unknown,@Res()res:Response){requireCouple(r.user.slug);const d=parse(identity.strict(),query),room=this.s.get(d.sessionId);
    let detach:(()=>void)|undefined;const close=(reason?:string)=>{if(reason&&!res.writableEnded&&!res.destroyed)res.write(`event: ended\ndata: {}\n\n`);res.end();};
    // Validate membership before sending headers, keeping HTTP errors inspectable.
    room.pulse(r.user.id,d.clientId,false);
    res.status(200).set({'Content-Type':'text/event-stream','Cache-Control':'private, no-store','X-Accel-Buffering':'no'});res.flushHeaders();
    detach=room.connect(r.user.id,d.clientId,{close,send:state=>{if(!res.destroyed&&!res.writableEnded&&!res.write(`data: ${JSON.stringify(state)}\n\n`))res.destroy();}});
    res.on('close',()=>detach?.());
  }
}
