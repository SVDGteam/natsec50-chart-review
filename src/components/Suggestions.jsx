import {useEffect,useState} from 'react';
import {Lightbulb,Pencil,Trash2} from 'lucide-react';
import {api,formatDate} from '../api';
const PROMPT='What question should the graph answer? What data would it use (for example capital, federal awards, headcount, offices)? Which chart type do you picture, and how would it fit the report?';
function friendly(message){return /review_suggestions|does not exist|schema cache/i.test(message)?'Suggestions need a one-time database update before they can be shared (see SUPABASE_SETUP.md, step 2).':message;}
function Suggestion({s,reviewer,onRefresh,onError}){
 const [editing,setEditing]=useState(false),[title,setTitle]=useState(s.title),[body,setBody]=useState(s.body),[busy,setBusy]=useState(false);
 const own=reviewer?.id===s.reviewer_id;
 async function save(e){e.preventDefault();setBusy(true);try{await api('/api/suggestions/'+s.id,{title,body},'PATCH');setEditing(false);await onRefresh();}catch(e){onError(friendly(e.message));}finally{setBusy(false);}}
 async function remove(){if(!confirm('Remove this suggestion?'))return;setBusy(true);try{await api('/api/suggestions/'+s.id,{},'DELETE');await onRefresh();}catch(e){onError(friendly(e.message));}finally{setBusy(false);}}
 if(s.deleted_at)return <article className="suggestion removed"><p className="comment-body removed">Suggestion removed</p></article>;
 return <article className="suggestion"><div className="comment-meta"><strong>{s.author}</strong><time dateTime={s.created_at}>{formatDate(s.created_at)}</time></div>
  {editing?<form className="suggestion-form" onSubmit={save}><input aria-label="Suggestion title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120}/><textarea aria-label="Describe the graph" value={body} onChange={e=>setBody(e.target.value)} maxLength={4000}/><div className="form-actions"><button type="button" className="text-button" onClick={()=>{setEditing(false);setTitle(s.title);setBody(s.body);}}>Cancel</button><button className="button small primary" disabled={busy||!title.trim()||!body.trim()}>Save</button></div></form>
  :<><h3>{s.title}</h3><p className="suggestion-body">{s.body}</p>{own&&<div className="comment-actions"><button onClick={()=>setEditing(true)}><Pencil size={12}/> Edit</button><button onClick={remove} disabled={busy}><Trash2 size={12}/> Remove</button></div>}</>}
 </article>;
}
export default function Suggestions({reviewer,requireReviewer}){
 const [list,setList]=useState([]),[title,setTitle]=useState(''),[body,setBody]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(){const d=await api('/api/suggestions');setList(d.suggestions);}
 useEffect(()=>{let active=true;setLoading(true);api('/api/suggestions').then(d=>{if(active){setList(d.suggestions);setError('');}}).catch(e=>{if(active)setError(friendly(e.message));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[reviewer?.id]);
 useEffect(()=>{const t=setInterval(()=>{if(document.visibilityState==='visible')load().catch(()=>{});},15000);return()=>clearInterval(t);},[reviewer?.id]);
 async function post(){setBusy(true);try{await api('/api/suggestions',{title:title.trim(),body:body.trim()});setTitle('');setBody('');setError('');await load();}catch(e){setError(friendly(e.message));}finally{setBusy(false);}}
 const visible=list.filter(s=>!s.deleted_at);
 return <section className="suggestions">
  <div className="results-intro"><div><h2>Suggest a new graph</h2><p>Describe a graph you would like to see in the report. Everyone signed in to the review can read suggestions.</p></div></div>
  <form className="suggestion-form compose" onSubmit={e=>{e.preventDefault();requireReviewer(post);}}>
   <label htmlFor="suggestion-title">Short title</label>
   <input id="suggestion-title" value={title} onChange={e=>setTitle(e.target.value)} maxLength={120} placeholder="e.g. Federal awards per employee by technology area"/>
   <label htmlFor="suggestion-body">Describe the graph</label>
   <textarea id="suggestion-body" value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} placeholder={PROMPT}/>
   <div className="form-actions"><span className="muted">{body.length}/4000</span><button className="button primary" disabled={busy||!title.trim()||!body.trim()}><Lightbulb size={16}/>{busy?'Posting…':'Post suggestion'}</button></div>
  </form>
  {error&&<p className="inline-error" role="alert">{error}</p>}
  <div className="suggestion-list" aria-live="polite">
   <h2>{visible.length} {visible.length===1?'suggestion':'suggestions'}</h2>
   {loading?<p className="muted">Loading suggestions…</p>:visible.length?list.map(s=><Suggestion key={s.id} s={s} reviewer={reviewer} onRefresh={load} onError={setError}/>):<p className="muted">No suggestions yet. Be the first.</p>}
  </div>
 </section>;
}
