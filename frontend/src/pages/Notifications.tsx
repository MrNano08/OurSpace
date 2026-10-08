import { useEffect,useState } from 'react';
import { Bell,Check,Clock3,Sparkles } from 'lucide-react';
import { api,type Notice,type Page } from '../services/api';
import { dateFormat } from '../services/format';
import { ErrorText } from '../components/Modal';
import { type TogetherSection } from './Together';
import { Pagination } from '../components/Tasks';
export function NotificationsPage({revision,onChange,onOpen}:{revision:number;onChange:()=>void;onOpen:(kind:TogetherSection|'photo'|'wish',id:string)=>void}){
  const [data,setData]=useState<Page<Notice>|null>(null),[page,setPage]=useState(1),[error,setError]=useState(''),[busy,setBusy]=useState('');
  useEffect(()=>{let live=true;setError('');api<Page<Notice>>(`/notifications?page=${page}`).then(v=>{if(live){if(!v.items.length&&page>1){setPage(page-1);return;}setData(v);}}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[page,revision]);
  async function dismiss(id:string){setBusy(id);try{await api('/notifications/'+id+'/dismiss','POST');onChange();}catch(e){setError((e as Error).message);}finally{setBusy('');}}
  return <><header className="page-heading"><span className="eyebrow">POR SI SE TE PASÓ</span><h1>Notificaciones</h1><p className="muted">Lo que merece un momento de tu atención.</p></header><section className="paper"><ErrorText text={error}/>{error&&<button className="secondary" onClick={onChange}>Reintentar</button>}{!data&&!error&&<p>Cargando…</p>}{data?.total===0&&<div className="empty"><Bell size={34}/><h3>Todo tranquilo por aquí.</h3><p>Te avisaremos cuando haya algo nuevo.</p></div>}{data?.items.map(n=><article className="notification-row" key={n.id}><span className={`notice-icon ${n.kind==='task'?'sage':'lavender'}`}>{n.kind==='task'?<Clock3 size={18}/>:<Sparkles size={18}/>}</span><div><p>{n.text}</p><time>{dateFormat(n.createdAt)}</time>{(n.kind==='message'||n.kind==='petition'||n.kind==='photo'||n.kind==='wish')&&n.resourceId&&<button className="text-button notice-open" onClick={()=>onOpen(n.kind as TogetherSection|'photo'|'wish',n.resourceId!)}>{n.kind==='message'?'Abrir mensaje':n.kind==='photo'?'Ver foto':n.kind==='wish'?'Ver idea':'Ver petición'}</button>}</div><button className="icon-button" disabled={Boolean(busy)} onClick={()=>void dismiss(n.id)} aria-label={`Descartar: ${n.text}`} title="Descartar"><Check size={18}/></button></article>)}<Pagination page={page} total={data?.total||0} size={30} onChange={setPage}/></section></>;
}
