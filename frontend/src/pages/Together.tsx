import { MessageCircle,HandHeart } from 'lucide-react';
import { type User,type Profile } from '../services/api';
import { MessagesPage } from './Messages';
import { PetitionsPage } from './Petitions';

export type TogetherSection='message'|'petition';
export function TogetherPage({user,peer,revision,onChange,section,onSection,focusId,onClearFocus}:{user:User;peer?:Profile;revision:number;onChange:()=>void;section:TogetherSection;onSection:(s:TogetherSection)=>void;focusId:string|null;onClearFocus:()=>void}){
  return <><header className="page-heading"><span className="eyebrow">UN RATITO PARA LOS DOS</span><h1>Entre nosotros</h1><p className="muted">Algo que decir. Algo que compartir.</p></header><div className="together-tabs" aria-label="Mensajes y peticiones"><button className={section==='message'?'active':''} onClick={()=>{onClearFocus();onSection('message');}}><MessageCircle size={18}/> Mensajes</button><button className={section==='petition'?'active':''} onClick={()=>{onClearFocus();onSection('petition');}}><HandHeart size={18}/> Peticiones</button></div>{section==='message'?<MessagesPage user={user} peer={peer} revision={revision} onChange={onChange} focusId={focusId} onClearFocus={onClearFocus}/>:<PetitionsPage user={user} peer={peer} revision={revision} onChange={onChange} focusId={focusId} onClearFocus={onClearFocus}/>}</>;
}
