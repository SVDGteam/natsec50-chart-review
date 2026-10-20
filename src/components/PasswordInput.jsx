import {useState} from 'react';
import {Eye,EyeOff} from 'lucide-react';
export default function PasswordInput({id,label='password',...props}){
 const [visible,setVisible]=useState(false);const Icon=visible?EyeOff:Eye;
 return <div className="password-input"><input {...props} id={id} type={visible?'text':'password'}/><button type="button" className="password-toggle" aria-label={(visible?'Hide ':'Show ')+label} aria-pressed={visible} aria-controls={id} onClick={()=>setVisible(v=>!v)}><Icon size={18}/><span>{visible?'Hide':'Show'}</span></button></div>;
}
