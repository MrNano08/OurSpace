import { randomUUID } from 'node:crypto';
import { ConflictException,ForbiddenException,GoneException,HttpException } from '@nestjs/common';
export type Snapshot={sessionId:string;videoId:string;version:number;position:number;paused:boolean;serverTime:number;present:number;ready:number};
export type Command={sessionId:string;clientId:string;seq:number;baseVersion:number;position:number;paused:boolean};
type Sink={send:(state:Snapshot)=>void;close:(reason?:string)=>void};
type Member={clientId:string;until:number;seq:number;ready:boolean;sink?:Sink;lastCommand:number};
/** One ephemeral room for the two seeded accounts. All mutations are synchronous. */
export class WatchRoom {
  readonly id=randomUUID(); readonly members=new Map<string,Member>();
  version=1;private position:number;private paused:boolean;private changed:number;private emptySince:number;
  constructor(readonly videoId:string,readonly duration:number,position:number,paused:boolean,private clock=Date.now){this.position=Math.min(duration,position);this.paused=paused;this.changed=this.emptySince=clock();}
  snapshot():Snapshot{const now=this.clock(),position=Math.min(this.duration,this.position+(this.paused?0:Math.max(0,now-this.changed)/1000));const live=[...this.members.values()].filter(m=>m.sink&&m.until>now);return {sessionId:this.id,videoId:this.videoId,version:this.version,position,paused:this.paused||position>=this.duration,serverTime:now,present:live.length,ready:live.filter(m=>m.ready).length};}
  join(user:string,clientId:string){this.expireMembers();const old=this.members.get(user);if(old&&old.clientId!==clientId)throw new ConflictException('Ya tienes Ver juntos abierto en otra pestaña. Sal allí o espera un minuto.');if(!old)this.members.set(user,{clientId,until:this.clock()+70000,seq:0,ready:false,lastCommand:-Infinity});else old.until=this.clock()+70000;this.emptySince=this.clock();return this.snapshot();}
  private member(user:string,clientId:string){const m=this.members.get(user);if(!m||m.clientId!==clientId||m.until<=this.clock())throw new GoneException('Vuelve a entrar a Ver juntos.');return m;}
  connect(user:string,clientId:string,sink:Sink){const m=this.member(user,clientId);m.sink?.close();m.sink=sink;this.broadcast();return ()=>{if(m.sink===sink){m.sink=undefined;m.ready=false;this.broadcast();}};}
  pulse(user:string,clientId:string,ready:boolean){const m=this.member(user,clientId);m.until=this.clock()+70000;const changed=m.ready!==ready;m.ready=ready;if(changed)this.broadcast();return this.snapshot();}
  command(user:string,c:Command){if(c.sessionId!==this.id)throw new GoneException('La sesión ha caducado.');const m=this.member(user,c.clientId);if(!m.sink)throw new ConflictException('Espera a recuperar la sincronización.');if(c.seq<=m.seq)return this.snapshot();
    if(this.clock()-m.lastCommand<100)throw new HttpException('Espera un instante antes de otro control.',429);
    m.seq=c.seq;m.lastCommand=this.clock();
    if(c.baseVersion!==this.version)throw new ConflictException({message:'Coincidieron dos controles; se conserva el primero recibido. Puedes volver a intentarlo.',state:this.snapshot()});
    this.position=Math.min(c.position,this.duration);this.paused=c.paused;this.changed=this.clock();this.version++;this.broadcast();return this.snapshot();
  }
  leave(user:string,clientId:string){const m=this.members.get(user);if(m?.clientId===clientId){this.members.delete(user);m.sink?.close();if(!this.members.size)this.emptySince=this.clock();this.broadcast();}return {ok:true};}
  private expireMembers(){for(const [user,m] of this.members)if(m.until<=this.clock())this.leave(user,m.clientId);}
  tick(){this.expireMembers();this.broadcast();const end=this.changed+(this.paused?0:Math.max(0,this.duration-this.position)*1000);return (!this.members.size&&this.clock()-this.emptySince>=300000)||this.clock()-end>=1800000;}
  broadcast(){const state=this.snapshot();for(const m of this.members.values())m.sink?.send(state);}
  close(){for(const m of this.members.values())m.sink?.close('expired');this.members.clear();}
}
export function requireCouple(slug:string){if(slug!=='ronaldo'&&slug!=='scarlet')throw new ForbiddenException('Sesión exclusiva de nuestras dos cuentas.');}
