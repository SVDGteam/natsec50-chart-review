import {cloudApi, cloudExport, cloudAuth, cloudStatus} from './cloud';
export const isHosted = import.meta.env.VITE_REVIEW_BACKEND === 'supabase';
export const hostingStatus = isHosted ? cloudStatus : {configured:true};
export const auth = cloudAuth;
export function assetUrl(path){return import.meta.env.BASE_URL + path.replace(/^\//,'');}
export async function api(path, body, method = 'POST') {
  if(isHosted) return cloudApi(path,body,method);
  const response = await fetch(path, body === undefined ? {credentials:'same-origin'} : {method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}
export async function exportFeedback(kind){
 if(!isHosted){location.href='/api/export.csv?type='+kind;return;}
 const csv=await cloudExport(kind);const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='natsec50-'+kind+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export {groups,orderItems} from './chart-library';
const LAST_KEY='ns50-last-chart',VARIANT_KEY='ns50-last-variants';
export function initialSelection(){let saved=null;try{saved=localStorage.getItem(LAST_KEY);}catch{}return location.hash.match(/^#chart=([A-Za-z0-9]{5})$/)?.[1] || (/^[A-Za-z0-9]{5}$/.test(saved||'')?saved:'85B2M');}
export function rememberView(id,variants){try{localStorage.setItem(LAST_KEY,id);localStorage.setItem(VARIANT_KEY,JSON.stringify(variants||{}));}catch{}}
export function initialVariants(){return {};} // each analysis opens on its catalogue default (Excluding CDC first); the last-clicked view is not restored
export function formatDate(value){return new Date(value).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});}
