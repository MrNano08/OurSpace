export const dateFormat=(n:number)=>new Intl.DateTimeFormat('es-CR',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Costa_Rica'}).format(n);
export function remaining(n:number|null,now=Date.now()){
  if(n===null)return 'Sin fecha límite';const minutes=Math.ceil(Math.abs(n-now)/60000);const label=minutes<60?`${Math.max(1,minutes)} min`:minutes<1440?`${Math.floor(minutes/60)} h ${minutes%60} min`:`${Math.floor(minutes/1440)} días`;
  return n<now?`Venció hace ${label}`:`Quedan ${label}`;
}
export function localDateInput(n:number|null){if(n===null)return '';const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Costa_Rica',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(n);return parts.replace(' ','T');}
export const parseDateInput=(s:string)=>s?Date.parse(s+':00-06:00'):null;
