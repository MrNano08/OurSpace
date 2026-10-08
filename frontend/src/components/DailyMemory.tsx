import { useEffect,useState } from 'react';
import { Sparkles,ArrowRight } from 'lucide-react';
import { api,type Photo } from '../services/api';
import { ErrorText } from './Modal';
export function DailyMemory({revision,onOpen}:{revision:number;onOpen:(id:string)=>void}){
  const [data,setData]=useState<{day:string;photo:Photo|null}|null>(null),[error,setError]=useState(''),[broken,setBroken]=useState(false);
  useEffect(()=>{let live=true;api<{day:string;photo:Photo|null}>('/collections/memory').then(d=>{if(live){setData(d);setError('');setBroken(false);}}).catch(e=>{if(live){setError(e.message);setData(null);}});return()=>{live=false;};},[revision]);
  return <section className="daily-memory paper"><div><span className="eyebrow"><Sparkles size={14}/> UN MOMENTO NUESTRO</span><h2>El recuerdo de hoy</h2>{data?.photo?<><p className="muted">Una misma foto para los dos. Una excusa para volver a sonreír.</p><button className="text-button" onClick={()=>onOpen(data.photo!.id)}>Volver a ese momento <ArrowRight size={16}/></button></>:<p className="muted">{!data&&!error?'Buscando un momento…':'Hoy todavía no hay un recuerdo compartido disponible. Solo aparecerán fotos que ambos puedan abrir.'}</p>}<ErrorText text={error}/></div>{data?.photo&&!broken&&<button className="memory-picture" onClick={()=>onOpen(data.photo!.id)} aria-label="Abrir el recuerdo de hoy"><img src={`/api/gallery/${data.photo.id}/file/thumb`} alt={data.photo.description||'El recuerdo de hoy'} onError={()=>setBroken(true)}/></button>}</section>;
}
