export function blankState(catalog){return {reviewer:null,mine:{},stats:Object.fromEntries(catalog.items.map(x=>[x.id,{up:0,down:0,comments:0,preferences:{}}]))};}
export function aggregate(catalog,reviews,comments,userId){
 const state=blankState(catalog);const revisions=new Map(catalog.items.map(x=>[x.id,x.revision]));
 for(const r of reviews){if(revisions.get(r.chart_id)!==r.revision)continue;const s=state.stats[r.chart_id];if(r.vote===1)s.up++;if(r.vote===-1)s.down++;if(r.preference)s.preferences[r.preference]=(s.preferences[r.preference]||0)+1;if(r.reviewer_id===userId)state.mine[r.chart_id]={vote:r.vote,preference:r.preference,updated_at:r.updated_at};}
 for(const c of comments)if(revisions.get(c.chart_id)===c.revision&&!c.deleted_at)state.stats[c.chart_id].comments++;
 return state;
}
export function toCsv(rows){return '\ufeff'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n')+'\r\n';}
