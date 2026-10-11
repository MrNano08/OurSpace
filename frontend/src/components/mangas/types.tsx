export type Progress={chapterId:string;mangaId:string;page:number;offset:number;assetId:string|null;updatedAt:number};
export type Book={id:string;ownerId:string;title:string;description:string;category:string;links:string[]|string;coverId:string|null;revision:number;status:string;progress:Progress|null};
export type Asset={id:string;kind:string;filename:string;bytes:number;pages:number;width:number;height:number};
export type Chapter={id:string;mangaId:string;title:string;volumeId:string|null;position:number;kind:'images'|'pdf'|'link';assets:string[];links:string[]};
export type Detail={book:Book;volumes:{id:string;title:string;position:number}[];chapters:Chapter[];progress:Progress[]};
export type Reading={chapter:Chapter;assets:Asset[];progress:Progress|null};
export const fileUrl=(id:string)=>'/api/mangas/assets/'+id+'/file';
export const urls=(value:string|string[])=>Array.isArray(value)?value:JSON.parse(value||'[]') as string[];
export const splitLinks=(text:string)=>text.split('\n').map(x=>x.trim()).filter(Boolean);
export function ExternalLinks({links}: {links:string[]}){return <>{links.map((url,i)=><a key={url+i} className="text-button" href={url} target="_blank" rel="noopener noreferrer">Leer en la página original{links.length>1?` (${i+1})`:''} ↗</a>)}</>;}
