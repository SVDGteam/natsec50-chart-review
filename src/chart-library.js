export const groups = [
 {id:'all',label:'All charts',categories:[]},
 {id:'government',label:'Government awards',categories:['awards','buyers','products','contracts']},
 {id:'technology',label:'Critical technologies',categories:['technology']},
 {id:'capital',label:'Private investment',categories:['capital']},
 {id:'people',label:'People & places',categories:['people','places']},
 {id:'us',label:'US government',categories:['us']},
 {id:'other',label:'Other analyses',categories:['companies','investors']},
];
const categoryOrder=new Map(groups.slice(1).flatMap((g,index)=>g.categories.map(c=>[c,index])));
export function orderItems(items){return items.map((item,index)=>({item,index})).sort((a,b)=>(categoryOrder.get(a.item.categoryId)??99)-(categoryOrder.get(b.item.categoryId)??99)||a.index-b.index).map(x=>x.item);}
export function publishedUrl(id){if(!/^[A-Za-z0-9]{5}$/.test(id))throw new Error('Invalid chart ID');return 'https://datawrapper.dwcdn.net/'+id+'/';}
export function chartLinkId(href,ids){
 try{const url=new URL(href);if(url.protocol!=='https:')return null;const match=url.hostname==='app.datawrapper.de'?url.pathname.match(/^\/preview\/([A-Za-z0-9]{5})\/?$/):url.hostname==='datawrapper.dwcdn.net'?url.pathname.match(/^\/([A-Za-z0-9]{5})(?:\/\d+)?\/?$/):null;return match&&ids.includes(match[1])?match[1]:null;}catch{return null;}
}
