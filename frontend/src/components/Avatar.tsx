import { useEffect,useState } from 'react';
import { api,type User } from '../services/api';
import { ErrorText } from './Modal';
export function AvatarImage({id,name}:{id?:string|null;name:string}){const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[id]);return id&&!failed?<img className="avatar-photo" src={'/api/assets/'+id} alt="" onError={()=>setFailed(true)}/>:<>{name[0]||'♡'}</>;}
export function AvatarTools({user,onUpdate,onBusy}:{user:User;onUpdate:(u:User)=>void;onBusy:(b:boolean)=>void}){
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function upload(file?:File){if(!file)return;setBusy(true);onBusy(true);setError('');try{if(file.size>20*1024*1024)throw new Error('La foto supera 20 MiB.');const data=new FormData();data.append('file',file);onUpdate(await api<User>('/profile/avatar','POST',data));}catch(e){setError((e as Error).message);}finally{setBusy(false);onBusy(false);}}
  async function remove(){setBusy(true);onBusy(true);setError('');try{onUpdate(await api<User>('/profile/avatar','DELETE'));}catch(e){setError((e as Error).message);}finally{setBusy(false);onBusy(false);}}
  return <div className="avatar-tools"><label>Foto de perfil<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{void upload(e.target.files?.[0]);e.target.value='';}}/></label><p className="field-help">Solo visible dentro del sitio al iniciar sesión. JPEG, PNG o WebP; máximo 20 MiB.</p>{busy&&<p role="status">Actualizando foto…</p>}{user.avatarId&&<button className="text-button" type="button" disabled={busy} onClick={()=>void remove()}>Quitar foto de perfil</button>}<ErrorText text={error}/></div>;
}
