export const recurrenceRules=['none','daily','weekly','monthly','yearly'] as const;
export type Recurrence=typeof recurrenceRules[number];
const DAY=86400000,CR_OFFSET=6*3600000;

/** Calendar arithmetic is anchored in Costa Rica (UTC-6), independent of host TZ. */
export function occurrenceAt(anchor:number,rule:string,index:number):number {
  if(rule==='none')return anchor;
  if(rule==='daily'||rule==='weekly')return anchor+index*DAY*(rule==='weekly'?7:1);
  const local=new Date(anchor-CR_OFFSET);
  const year=local.getUTCFullYear()+(rule==='yearly'?index:0);
  const month=local.getUTCMonth()+(rule==='monthly'?index:0);
  const days=new Date(Date.UTC(year,month+1,0)).getUTCDate();
  return Date.UTC(year,month,Math.min(local.getUTCDate(),days),local.getUTCHours(),local.getUTCMinutes(),local.getUTCSeconds(),local.getUTCMilliseconds())+CR_OFFSET;
}

export function nextOccurrence(anchor:number,rule:string,after:number,until:number|null=null):number|null {
  if(rule==='none')return anchor>=after&&(until===null||anchor<=until)?anchor:null;
  let index=0;
  if(after>anchor){
    if(rule==='daily'||rule==='weekly')index=Math.max(0,Math.floor((after-anchor)/(DAY*(rule==='weekly'?7:1)))-1);
    else {const a=new Date(anchor-CR_OFFSET),b=new Date(after-CR_OFFSET);index=Math.max(0,rule==='monthly'?(b.getUTCFullYear()-a.getUTCFullYear())*12+b.getUTCMonth()-a.getUTCMonth()-1:b.getUTCFullYear()-a.getUTCFullYear()-1);}
  }
  for(let i=0;i<5;i++,index++){
    const candidate=occurrenceAt(anchor,rule,index);
    if(candidate>=after)return (until===null||candidate<=until)&&candidate<=4102444800000?candidate:null;
  }
  return null;
}
export function occurrencesBetween(anchor:number,rule:string,from:number,to:number,until:number|null=null):number[]{
  const result:number[]=[];let next=nextOccurrence(anchor,rule,from,until);
  while(next!==null&&next<to&&result.length<100){result.push(next);next=nextOccurrence(anchor,rule,next+1,until);}
  return result;
}
