import { useEffect,useRef,type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current!;d.showModal();const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{d.close();document.body.style.overflow=before;};},[]);
  return <dialog ref={ref} className="modal" onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-body"><div className="section-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={20}/></button></div>{children}</div></dialog>;
}
export function ErrorText({text}:{text:string}){return text?<p className="error" role="alert">{text}</p>:null;}
