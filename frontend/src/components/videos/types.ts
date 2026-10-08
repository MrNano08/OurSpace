export type Folder={id:string;name:string;description:string;coverId:string|null;position:number;count:number};
export type Progress={seconds:number;percent:number;completed:boolean;updatedAt:number};
export type VideoItem={id:string;folderId:string|null;title:string;description:string;thumbnailId:string|null;position:number;duration:number;bytes:number;favorite:boolean;progress:Progress|null};
export type Catalog={folders:Folder[];videos:VideoItem[];revision:number;canAdmin:boolean;downloads:boolean;maxBytes:number;chunkBytes:number};
export type Upload={id:string;filename:string;bytes:number;received:number;lastModified:number;fingerprint:string;title:string;description:string;folderId:string|null};
export const imageUrl=(id:string)=>'/api/videos/images/'+id;
export function duration(seconds:number){const n=Math.max(0,Math.floor(seconds));return n>=3600?`${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`:`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
export function bytes(n:number){return n>=1024**3?`${(n/1024**3).toFixed(2)} GiB`:`${(n/1024**2).toFixed(1)} MiB`;}
