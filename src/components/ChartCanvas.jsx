import {useState} from 'react';
import {ExternalLink,Maximize2,ThumbsUp,ThumbsDown,Check} from 'lucide-react';
import Dialog from './Dialog';
import LiveChart from './LiveChart';
export default function ChartCanvas({item,variant,onVariant,mine,stats,onReview,busy}){
 const [enlarged,setEnlarged]=useState(false);
 return <section className="chart-canvas" aria-label={item.label}>
  <div className="canvas-header"><div><h2>{item.label}</h2><span className="canvas-subject">{item.category}</span></div><div className="source-links"><a href={variant.preview} target="_blank" rel="noreferrer">Datawrapper <ExternalLink size={13}/></a><a href={variant.source} target="_blank" rel="noreferrer">Source <ExternalLink size={13}/></a></div></div>
  {item.consolidatedFrom?.length>0&&<p className="muted">Earlier votes and comments on the separate private-capital chart are retained in the feedback exports.</p>}
  {item.variants.length>1&&<div className="variant-switch" role="group" aria-label="CDC comparison">{item.variants.map(v=><button key={v.id} className={variant.id===v.id?'selected':''} aria-pressed={variant.id===v.id} onClick={()=>onVariant(v.id)}>{v.label}</button>)}</div>}
  <div className="live-chart-controls"><button className="button small" onClick={()=>setEnlarged(true)} aria-label="Enlarge chart"><Maximize2 size={16}/> Enlarge</button></div>
  {!enlarged?<LiveChart key={variant.id} variant={variant} variants={item.variants} onVariant={onVariant}/>:<p className="muted">Chart open in enlarged view.</p>}
  <div className="vote-strip"><div className="vote-controls"><button className={'vote-button '+(mine?.vote===1?'voted-up':'')} onClick={()=>onReview({vote:mine?.vote===1?null:1})} aria-pressed={mine?.vote===1} disabled={busy}><ThumbsUp size={19}/><span>Include in report</span><strong>{stats?.up||0}</strong></button><button className={'vote-button '+(mine?.vote===-1?'voted-down':'')} onClick={()=>onReview({vote:mine?.vote===-1?null:-1})} aria-pressed={mine?.vote===-1} disabled={busy}><ThumbsDown size={19}/><span>Leave out</span><strong>{stats?.down||0}</strong></button></div>{item.variants.length>1&&<label className="preference">Preferred view<select aria-label="Preferred view" value={mine?.preference||''} onChange={e=>onReview({preference:e.target.value||null})} disabled={busy}><option value="">No preference</option>{item.variants.map(v=><option key={v.id} value={v.id}>{v.label}</option>)}<option value="either">Either view</option></select></label>}</div><div className="vote-note" aria-live="polite">{mine?.vote?<><Check size={13}/> Your vote is saved. Click it again to clear it.</>:<>{item.variants.length>1?'One vote per reviewer, across both views.':'One vote per reviewer, for this analysis.'}</>}</div>
  {enlarged&&<Dialog wide title={item.label+' · '+variant.label} onClose={()=>setEnlarged(false)}><LiveChart key={'expanded-'+variant.id} variant={variant} variants={item.variants} onVariant={onVariant} expanded/></Dialog>}
 </section>;
}
