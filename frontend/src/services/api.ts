export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,method='GET',body?:unknown):Promise<T>{
  const res=await fetch('/api'+path,{method,credentials:'include',headers:body===undefined||body instanceof FormData?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:body instanceof FormData?body:JSON.stringify(body)});
  const data=await res.json().catch(()=>null);
  if(!res.ok){if(res.status===401&&path!=='/auth/login'&&path!=='/auth/me'&&path!=='/auth/password')window.dispatchEvent(new Event('session-expired'));throw new ApiError(data?.message||'No se pudo completar la solicitud.',res.status);}
  return data as T;
}
export type Profile={id:string;slug:string;name:string;accent:string;avatarId?:string|null};
export type User=Profile&{email:string;mustChangePassword:boolean};
export type Task={id:string;title:string;notes:string;priority:number;dueAt:number|null;completed:boolean;recurrence:string;recurrenceUntil:number|null;nextTaskId:string|null;email:boolean};
export type Counter={id:string;ownerId:string;targetId:string;label:string;emoji:string;value:number};
export type Notice={id:string;text:string;kind:string;resourceId:string|null;createdAt:number};
export type Change={id:string;delta:number;valueAfter:number;createdAt:number};
export type Page<T>={items:T[];total:number;page:number};
export type CalendarEvent={id:string;title:string;notes:string;location:string;startsAt:number;endsAt:number;recurrence:string;recurrenceUntil:number|null;alertMinutes:number|null;email:boolean;occurrenceAt:number;occurrenceEnd:number};
export type Reminder={id:string;ownerId:string;targetId:string;title:string;notes:string;remindAt:number;email:boolean;completedAt:number|null;deliveredAt:number|null};
export type Message={id:string;ownerId:string;targetId:string;body:string;deliverAt:number;scheduled:boolean};
export type PetitionStatus='pending'|'accepted'|'rejected'|'chance'|'maybe';
export type Petition={id:string;ownerId:string;targetId:string;title:string;details:string;status:PetitionStatus;responseNote:string;createdAt:number;updatedAt:number};

export type GallerySection='available'|'protected'|'upcoming'|'favorites'|'all';
export type Photo={id:string;ownerId:string;createdAt:number;unlockAt:number|null;protected:boolean;accessible:boolean;lockReason:'date'|'password'|null;favorite?:boolean;albumId?:string|null;description?:string;location?:string;album?:string;tags?:string[];capturedAt?:string|null;captureOffset?:string|null;dateSource?:string;width?:number;height?:number;bytes?:number;format?:string};
export type GalleryPage={items:Photo[];nextCursor:string|null};

export type Album={id:string;ownerId:string;name:string;count:number};
export type Wish={id:string;ownerId:string;targetId:string;kind:'experience'|'purchase';title:string;notes:string;url:string;priceCents:number|null;currency:'CRC'|'USD';completed:boolean;revision:number;assetId:string|null;createdAt:number;updatedAt:number};
