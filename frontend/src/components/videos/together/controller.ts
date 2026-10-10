export type State={sessionId:string;videoId:string;version:number;position:number;paused:boolean;serverTime:number;present:number;ready:number};
export type Status={active:boolean;connected:boolean;present:number;synced:boolean;blocked:boolean;notice:string};
class Failure extends Error {constructor(message:string,readonly status:number,readonly state?:State){super(message);}}
/** Optional controller. Never owns the video's source or individual progress. */
export class TogetherController {
  private individualRate=1;private clientId=crypto.randomUUID();private state?:State;private source?:EventSource;
  private status:Status={active:false,connected:false,present:0,synced:false,blocked:false,notice:''};
  private closed=false;private generation=0;private attempt=0;private seq=0;private offset=0;private lastMessage=0;private lastApply=0;
  private retry?:ReturnType<typeof setTimeout>;private poll?:ReturnType<typeof setInterval>;private debounce?:ReturnType<typeof setTimeout>;
  private intentUntil=0;private waiting=false;private expectedPlay=false;private expectedPause=false;private remoteSeek:number|null=null;
  private pending?:{position:number;paused:boolean};private sending=false;private pulseBusy=false;
  constructor(private video:HTMLVideoElement,private videoId:string,private report:(status:Status)=>void){}
  private update(patch:Partial<Status>){if(this.closed)return;this.status={...this.status,...patch};this.report(this.status);}
  private async post(path:string,body:object,keepalive=false){const start=Date.now(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),10000);try{
    const r=await fetch('/api/videos/together/'+path,{method:'POST',credentials:'include',keepalive,signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json().catch(()=>null);if(!r.ok)throw new Failure(data?.message||'Sincronización interrumpida.',r.status,data?.state);
    if(data?.serverTime&&Date.now()-start<3000)this.offset=data.serverTime-(start+Date.now())/2;return data;
  }finally{clearTimeout(timeout);}}
  async start(){if(this.status.active||this.closed)return;this.individualRate=this.video.playbackRate;this.lastPulse=-Infinity;this.attempt=0;this.update({active:true,notice:'Conectando con tu persona especial…'});this.attach();await this.connect();}
  private async connect(){const generation=++this.generation;this.source?.close();this.source=undefined;clearTimeout(this.retry);
    try{const state=await this.post('join',{clientId:this.clientId,videoId:this.videoId,position:this.video.currentTime||0,paused:this.video.paused});
      if(this.closed||!this.status.active||generation!==this.generation){if(this.closed||!this.status.active)void this.post('leave',{sessionId:state.sessionId,clientId:this.clientId},true).catch(()=>{});return;}
      this.state=state;this.accept(state,true);const source=new EventSource('/api/videos/together/events?'+new URLSearchParams({sessionId:state.sessionId,clientId:this.clientId}));this.source=source;
      source.onmessage=e=>{if(this.source!==source)return;try{const next:State=JSON.parse(e.data);this.lastMessage=performance.now();this.attempt=0;this.update({connected:true,notice:''});this.accept(next);void this.pulse();}catch{this.reconnect();}};
      source.addEventListener('ended',()=>{if(this.source===source)this.stop('La sesión terminó por inactividad. Puedes volver a entrar.');});
      source.onerror=()=>{if(this.source===source)this.reconnect();};
    }catch(e){if(this.closed||!this.status.active||generation!==this.generation)return;if(e instanceof Failure&&[401,403,404,409].includes(e.status)){this.stop(e.message);return;}this.reconnect();}
  }
  private reconnect(){if(this.closed||!this.status.active)return;this.source?.close();this.source=undefined;this.pending=undefined;this.video.playbackRate=1;this.update({connected:false,synced:false,notice:'Sincronización interrumpida. Reconectando… Puedes seguir viendo.'});clearTimeout(this.retry);const delay=Math.min(30000,1000*2**Math.min(this.attempt++,5))*(.8+Math.random()*.4);this.retry=setTimeout(()=>void this.connect(),delay);}
  private target(state:State){return Math.max(0,Math.min(this.video.duration||Infinity,state.position+(state.paused?0:Math.max(0,Date.now()+this.offset-state.serverTime)/1000)));}
  private accept(state:State,force=false){if(state.videoId!==this.videoId||!Number.isFinite(state.serverTime)||!Number.isFinite(state.position))return;if(this.state?.sessionId===state.sessionId&&state.version<this.state.version)return;const changed=force||!this.state||state.version!==this.state.version||state.sessionId!==this.state.sessionId;this.state=state;this.update({present:state.present});if(this.pending||this.sending)return;this.apply(changed);}
  private apply(force=false){if(!this.status.active||!this.status.connected)return;const state=this.state,v=this.video;if(!state||v.readyState<1||v.seeking||this.pending||this.sending)return;
    const target=this.target(state),drift=target-v.currentTime;this.lastApply=performance.now();
    // Stable dead band, bounded rate adjustment, direct correction for meaningful drift.
    if(force||Math.abs(drift)>1.5||state.paused&&Math.abs(drift)>.3){if(Math.abs(drift)>.15){this.remoteSeek=target;v.currentTime=target;}v.playbackRate=1;}
    else if(!state.paused&&!this.waiting&&Math.abs(drift)>.3)v.playbackRate=drift>0?1.04:.96;else v.playbackRate=1;
    if(state.paused){if(!v.paused){this.expectedPause=true;v.pause();}this.update({blocked:false});}
    else if(v.paused&&!v.ended&&!this.status.blocked&&!this.waiting){this.expectedPlay=true;const generation=this.generation;void v.play().then(()=>{if(this.status.active&&generation===this.generation)this.update({blocked:false});}).catch(()=>{if(!this.status.active||generation!==this.generation)return;this.expectedPlay=false;this.update({blocked:true,synced:false});void this.pulse(true);});}
    this.update({synced:state.present===2&&state.ready===2&&!this.waiting&&!this.status.blocked&&Math.abs(drift)<1.5});
  }
  resume(){this.update({blocked:false});this.waiting=false;this.apply(true);}
  private local=()=>{if(!this.status.active||!this.status.connected||!this.state)return;this.update({synced:false});this.pending={position:this.video.currentTime,paused:this.video.paused};clearTimeout(this.debounce);this.debounce=setTimeout(()=>void this.flush(),180);};
  private async flush(){if(this.sending||!this.pending||!this.state||!this.status.connected)return;const intent=this.pending;this.pending=undefined;this.sending=true;const generation=this.generation,sessionId=this.state.sessionId;
    try{const next=await this.post('command',{...intent,sessionId,clientId:this.clientId,seq:++this.seq,baseVersion:this.state.version});if(generation===this.generation)this.accept(next);}
    catch(e){if(generation!==this.generation)return;if(e instanceof Failure&&e.state){this.accept(e.state);this.update({notice:'Coincidieron dos controles. Puedes volver a intentarlo.'});}else if(e instanceof Failure&&e.status===429){this.update({notice:'Espera un instante antes de otro control.'});}else if(e instanceof Failure&&[401,403,404].includes(e.status)){this.stop(e.message);}else this.reconnect();}
    finally{this.sending=false;if(!this.closed&&this.status.active){if(this.pending)this.debounce=setTimeout(()=>void this.flush(),180);else this.apply(true);}}
  }
  private lastPulse=-Infinity;
  private async pulse(force=false){if(this.closed||!this.status.active||!this.state||!this.status.connected||this.pulseBusy||(!force&&performance.now()-this.lastPulse<25000))return;this.pulseBusy=true;this.lastPulse=performance.now();const generation=this.generation;
    try{const state=await this.post('pulse',{sessionId:this.state.sessionId,clientId:this.clientId,ready:!this.waiting&&!this.status.blocked&&this.video.readyState>=3});if(generation===this.generation)this.accept(state);}
    catch(e){if(generation!==this.generation)return;if(e instanceof Failure&&[401,403,404].includes(e.status))this.stop(e.message);else this.reconnect();}finally{this.pulseBusy=false;}}
  private onPlay=()=>{if(this.expectedPlay){this.expectedPlay=false;return;}if(this.status.blocked){this.update({blocked:false});if(this.state&&!this.state.paused){this.apply(true);void this.pulse(true);return;}}this.local();};
  private onPause=()=>{if(this.expectedPause){this.expectedPause=false;return;}if(this.video.ended||document.hidden||this.waiting&&this.video.readyState<3&&performance.now()>this.intentUntil)return;this.local();};
  private onSeeking=()=>{if(this.remoteSeek!==null&&Math.abs(this.video.currentTime-this.remoteSeek)>.5)this.remoteSeek=null;};
  private onSeeked=()=>{if(this.remoteSeek!==null){this.remoteSeek=null;return;}this.local();};
  private onWaiting=()=>{this.waiting=true;this.update({synced:false});void this.pulse(true);};
  private onPlaying=()=>{this.waiting=false;void this.pulse(true);};
  private onCanPlay=()=>{this.waiting=false;void this.pulse(true);if(performance.now()-this.lastApply>500)this.apply();};
  private onVisible=()=>{if(!document.hidden&&this.status.active){if(!this.status.connected||performance.now()-this.lastMessage>35000){clearTimeout(this.retry);void this.connect();}else{void this.pulse(true);this.apply(true);}}};
  private onHide=()=>{this.source?.close();this.source=undefined;this.update({connected:false,synced:false});};
  private onRate=()=>{if(this.video.playbackRate<.95||this.video.playbackRate>1.05){this.video.playbackRate=1;this.update({notice:'En Ver juntos usamos velocidad normal.'});}};
  private onInteraction=()=>{this.intentUntil=performance.now()+1500;};
  private listeners:[string,EventListener][]=[['pointerdown',this.onInteraction],['keydown',this.onInteraction],['play',this.onPlay],['pause',this.onPause],['seeking',this.onSeeking],['seeked',this.onSeeked],['waiting',this.onWaiting],['playing',this.onPlaying],['canplay',this.onCanPlay],['loadedmetadata',this.onCanPlay],['ratechange',this.onRate]];
  private attach(){for(const [event,listener]of this.listeners)this.video.addEventListener(event,listener);document.addEventListener('visibilitychange',this.onVisible);window.addEventListener('online',this.onVisible);window.addEventListener('pageshow',this.onVisible);window.addEventListener('pagehide',this.onHide);
    this.poll=setInterval(()=>{if(!this.status.active)return;if(this.status.connected&&performance.now()-this.lastMessage>35000)this.reconnect();else if(this.status.connected){void this.pulse();this.apply();}},5000);
  }
  stop(notice=''){const wasActive=this.status.active;++this.generation;clearTimeout(this.retry);clearTimeout(this.debounce);clearInterval(this.poll);this.source?.close();this.source=undefined;this.pending=undefined;
    for(const [event,listener]of this.listeners)this.video.removeEventListener(event,listener);document.removeEventListener('visibilitychange',this.onVisible);window.removeEventListener('online',this.onVisible);window.removeEventListener('pageshow',this.onVisible);window.removeEventListener('pagehide',this.onHide);
    if(this.state)void this.post('leave',{sessionId:this.state.sessionId,clientId:this.clientId},true).catch(()=>{});this.state=undefined;if(wasActive)this.video.playbackRate=this.individualRate;this.expectedPlay=this.expectedPause=false;this.remoteSeek=null;this.waiting=false;this.update({active:false,connected:false,present:0,synced:false,blocked:false,notice});
  }
  destroy(){this.stop();this.closed=true;}
}
