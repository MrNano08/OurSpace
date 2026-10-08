import { useEffect,useState } from 'react';
import { CalendarDays,ArrowRight } from 'lucide-react';
import { api,type CalendarEvent } from '../services/api';
import { dateFormat } from '../services/format';
import { ErrorText } from './Modal';
export function Upcoming({revision,onAgenda}:{revision:number;onAgenda:()=>void}){
  const [events,setEvents]=useState<CalendarEvent[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let live=true;const from=Date.now();setError('');api<{items:CalendarEvent[]}>(`/agenda?from=${from}&to=${from+7*86400000}`).then(r=>{if(live)setEvents(r.items.slice(0,3));}).catch(e=>{if(live)setError(e.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[revision]);
  return <section className="paper upcoming"><div className="section-head"><h2>En estos días</h2><button className="text-button" onClick={onAgenda}>Mi agenda <ArrowRight size={15}/></button></div><ErrorText text={error}/>{loading?<p className="loading">Consultando tus próximos planes…</p>:!error&&events.length===0?<button className="upcoming-empty" onClick={onAgenda}><CalendarDays size={22}/><span>La semana tiene espacio para un nuevo plan.</span><ArrowRight size={16}/></button>:events.map(e=><button className="upcoming-item" key={`${e.id}-${e.occurrenceAt}`} onClick={onAgenda}><span className="notice-icon sage"><CalendarDays size={17}/></span><span><strong>{e.title}</strong><small>{dateFormat(e.occurrenceAt)}</small></span><ArrowRight size={15}/></button>)}</section>;
}
