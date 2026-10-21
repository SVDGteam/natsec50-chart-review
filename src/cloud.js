import {createClient} from '@supabase/supabase-js';
import {aggregate,blankState,toCsv} from './review-model';
const url=import.meta.env.VITE_SUPABASE_URL||'';
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||'';
export const cloudStatus={configured:Boolean(url&&key)};
const client=cloudStatus.configured?createClient(url,key):null;
let catalogPromise;
async function catalog(){
 if(!catalogPromise)catalogPromise=fetch(import.meta.env.BASE_URL+'catalog.json').then(r=>{if(!r.ok)throw new Error('The chart catalog could not load.');return r.json();}).catch(e=>{catalogPromise=null;throw e;});
 return catalogPromise;
}
function required(){if(!client)throw new Error('Shared feedback is not connected yet. Follow SUPABASE_SETUP.md to configure it.');return client;}
function checked({data,error}){if(error)throw new Error(error.message);return data;}
async function user(){if(!client)return null;const {session}=checked(await client.auth.getSession());return session?checked(await client.auth.getUser())?.user:null;}
async function rpc(name,args){return checked(await required().rpc(name,args));}
async function rows(table,filters={}){
 const all=[];
 for(let offset=0;;offset+=500){let q=required().from(table).select('*');for(const [column,value] of Object.entries(filters))q=q.eq(column,value);
 const order=table==='review_votes'?['chart_id','revision','reviewer_id']:table==='review_comments'||table==='review_suggestions'?['created_at','id']:['id'];for(const column of order)q=q.order(column);
 const page=checked(await q.range(offset,offset+499));all.push(...page);if(page.length<500)return all;}
}
async function accessibleUser(){const u=await user();if(!u)return null;const allowed=await rpc('review_has_access',{});if(!allowed)throw new Error('This account is not on the reviewer list. Ask the project owner to add your email.');return u;}
async function reviewer(u){if(!u)return null;const data=checked(await required().from('review_profiles').select('id,name').eq('id',u.id).maybeSingle());return data||{id:u.id,name:u.email.split('@')[0]};}
export const cloudAuth={
 async signIn(email,password){checked(await required().auth.signInWithPassword({email,password}));try{await accessibleUser();}catch(e){await client.auth.signOut();throw e;}},
 async signOut(){checked(await required().auth.signOut());},
 async changePassword(password){if(password.length<12)throw new Error('Use at least 12 characters.');checked(await required().auth.updateUser({password}));}
};
export async function cloudApi(path,body,method='POST'){
 const c=await catalog();
 if(path==='/api/catalog')return c;
 if(path==='/api/state'){
  if(!client)return blankState(c);
  const u=await accessibleUser();if(!u)return blankState(c);
  const [reviews,comments,who]=await Promise.all([rows('review_votes'),rows('review_comments'),reviewer(u)]);
  return {...aggregate(c,reviews,comments,u.id),reviewer:who};
 }
 if(path==='/api/reviewer'){await rpc('review_set_name',{p_name:body.name});return {ok:true};}
 const match=path.match(/^\/api\/charts\/([a-zA-Z0-9]{5})\/(review|comments)$/);
 if(match){
  const item=c.items.find(x=>x.id===match[1]);if(!item)throw new Error('Unknown analysis.');
  if(match[2]==='review')return rpc('review_set_vote',{p_chart_id:item.id,p_revision:body.revision,p_patch:body});
  if(body===undefined){
   const u=await accessibleUser();if(!u)return {comments:[]};
   const [comments,profiles]=await Promise.all([rows('review_comments',{chart_id:item.id,revision:item.revision}),rows('review_profiles')]);
   const names=new Map(profiles.map(p=>[p.id,p.name]));return {comments:comments.map(x=>({...x,author:names.get(x.reviewer_id)||'Reviewer'}))};
  }
  return rpc('review_post_comment',{p_chart_id:item.id,p_revision:body.revision,p_variant:body.variantId,p_body:body.body,p_parent:body.parentId||null});
 }
 if(path==='/api/suggestions'){
  if(body===undefined){
   const u=await accessibleUser();if(!u)return {suggestions:[]};
   const [list,profiles]=await Promise.all([rows('review_suggestions'),rows('review_profiles')]);
   const names=new Map(profiles.map(p=>[p.id,p.name]));return {suggestions:list.map(x=>({...x,author:names.get(x.reviewer_id)||'Reviewer'})).reverse()};
  }
  return rpc('review_post_suggestion',{p_title:body.title,p_body:body.body});
 }
 const suggestion=path.match(/^\/api\/suggestions\/([\w-]+)$/);
 if(suggestion)return rpc(method==='DELETE'?'review_remove_suggestion':'review_edit_suggestion',method==='DELETE'?{p_id:suggestion[1]}:{p_id:suggestion[1],p_title:body.title,p_body:body.body});
 const comment=path.match(/^\/api\/comments\/([\w-]+)$/);
 if(comment)return rpc(method==='DELETE'?'review_remove_comment':'review_edit_comment',method==='DELETE'?{p_id:comment[1]}:{p_id:comment[1],p_body:body.body});
 throw new Error('Unsupported request.');
}
export async function cloudExport(kind){
 const u=await accessibleUser();if(!u)throw new Error('Sign in to export team feedback.');
 const c=await catalog();const [reviews,comments,profiles]=await Promise.all([rows('review_votes'),rows('review_comments'),rows('review_profiles')]);const names=new Map(profiles.map(p=>[p.id,p.name]));
 if(kind==='summary'){const s=aggregate(c,reviews,comments,u.id);return toCsv([['Analysis ID','Revision','Analysis','Include','Leave out','Comments','Preferred views'],...c.items.map(i=>[i.id,i.revision,i.label,s.stats[i.id].up,s.stats[i.id].down,s.stats[i.id].comments,JSON.stringify(s.stats[i.id].preferences)])]);}
 if(kind==='votes')return toCsv([['Analysis ID','Revision','Reviewer','Vote','Preferred view','Updated'],...reviews.map(r=>[r.chart_id,r.revision,names.get(r.reviewer_id)||'Reviewer',r.vote,r.preference,r.updated_at])]);
 if(kind==='comments')return toCsv([['Comment ID','Analysis ID','Revision','Variant','Reviewer','Parent comment','Comment','Created','Updated'],...comments.filter(x=>!x.deleted_at).map(x=>[x.id,x.chart_id,x.revision,x.variant_id,names.get(x.reviewer_id)||'Reviewer',x.parent_id,x.body,x.created_at,x.updated_at])]);
 throw new Error('Unknown export type.');
}
