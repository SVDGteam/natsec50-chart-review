import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function Dialog({title,onClose,children,wide=false}){
 const ref=useRef(null);
 useEffect(()=>{const before=document.activeElement;const el=ref.current;el.showModal();(el.querySelector('input,textarea,select')||el.querySelector('button'))?.focus();return()=>{el.close();before?.focus();};},[]);
 return <dialog ref={ref} className={wide?'dialog dialog-wide':'dialog'} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><div className="dialog-head"><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>{children}</dialog>;
}
