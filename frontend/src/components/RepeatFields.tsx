import { useEffect,useState } from 'react';
import { api } from '../services/api';
import { localDateInput } from '../services/format';
export const repeatLabels:Record<string,string>={none:'No se repite',daily:'Cada día',weekly:'Cada semana',monthly:'Cada mes',yearly:'Cada año'};
export function RepeatFields({value,until,onChange,onUntil}:{value:string;until:number|null;onChange:(v:string)=>void;onUntil:(v:number|null)=>void}){
  return <><div className="form-row"><label>Repetir<select value={value} onChange={e=>{onChange(e.target.value);if(e.target.value==='none')onUntil(null);}}>{Object.entries(repeatLabels).map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>{value!=='none'&&<label>Hasta · opcional<input type="date" value={until?localDateInput(until).slice(0,10):''} max="2099-12-31" onChange={e=>onUntil(e.target.value?Date.parse(e.target.value+'T23:59:59-06:00'):null)}/></label>}</div>{['monthly','yearly'].includes(value)&&<p className="field-help">Si ese día no existe en un mes, se usa su último día. El día original se conserva para las siguientes fechas.</p>}</>;
}
export function EmailOption({checked,onChange,disabled=false}:{checked:boolean;onChange:(v:boolean)=>void;disabled?:boolean}){
  const [available,setAvailable]=useState<boolean|null>(null);
  useEffect(()=>{let live=true;api<{emailAvailable:boolean}>('/reminders/options').then(r=>{if(live)setAvailable(r.emailAvailable);}).catch(()=>{if(live)setAvailable(false);});return()=>{live=false;};},[]);
  return <div><label className="checkbox-label"><input type="checkbox" checked={checked} onChange={e=>onChange(e.target.checked)} disabled={disabled||(!checked&&available!==true)}/>También avisar por correo</label>{available===false&&<p className="field-help">Gmail aún no está configurado. Los avisos dentro de la aplicación siguen disponibles.</p>}</div>;
}
