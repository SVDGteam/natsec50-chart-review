import {BarChart3,Landmark,Cpu,Layers3,Globe2,Flag,FileText} from 'lucide-react';
import {groups,isHosted,assetUrl} from '../api';
const icons=[BarChart3,Landmark,Cpu,Layers3,Globe2,Flag,FileText];
export default function Sidebar({selected,onSelect,items}){
 return <aside className="sidebar"><div className="brand"><img className="brand-logo" src={assetUrl('svdg-logo.png')} alt="Silicon Valley Defense Group" width="1500" height="500"/><strong>Chart review</strong></div><nav aria-label="Chart subjects">{groups.map((g,i)=>{const Icon=icons[i];const count=items.filter(x=>g.id==='all'||g.categories.includes(x.categoryId)).length;return <button key={g.id} onClick={()=>onSelect(g.id)} aria-current={selected===g.id?'page':undefined} className={'nav-item '+(selected===g.id?'active':'')}><Icon size={21} strokeWidth={1.6}/><span>{g.label}</span><small>{count}</small></button>;})}</nav><div className="sidebar-footer"><span className="local-dot"/> {isHosted?'Team review workspace':'Local review workspace'}<small>{isHosted?'Sign in to share feedback.':'Feedback stays on this computer.'}</small></div></aside>;
}
