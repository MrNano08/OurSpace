import { useSyncExternalStore } from 'react';

export type View='home'|'tasks'|'notifications'|'profile'|'agenda'|'reminders'|'together'|'gallery'|'plans'|'videos'|'mangas';
const views:View[]=['home','tasks','notifications','profile','agenda','reminders','together','gallery','plans','videos','mangas'];
const event='space-navigation';
function subscribe(fn:()=>void){window.addEventListener('hashchange',fn);window.addEventListener('popstate',fn);window.addEventListener(event,fn);return()=>{window.removeEventListener('hashchange',fn);window.removeEventListener('popstate',fn);window.removeEventListener(event,fn);};}
export function useRoute(){
 const hash=useSyncExternalStore(subscribe,()=>location.hash);
 const [name,query='']=hash.replace(/^#\/?/,'').split('?');
 return {view:views.includes(name as View)?name as View:'home',params:new URLSearchParams(query)};
}
export function navigate(view:View,params:Record<string,string|undefined>={},replace=false){
 const q=new URLSearchParams();for(const [k,v] of Object.entries(params))if(v!==undefined)q.set(k,v);
 const hash='#/'+view+(q.size?'?'+q.toString():'');
 if(location.hash===hash)return;
 if(!location.hash)history.replaceState(null,'','#/home');
 history[replace?'replaceState':'pushState'](null,'',hash);
 window.dispatchEvent(new Event(event));
}
