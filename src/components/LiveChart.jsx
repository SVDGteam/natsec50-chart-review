import {useEffect,useRef,useState} from 'react';
import {ExternalLink,RefreshCw} from 'lucide-react';
import {assetUrl} from '../api';
import {publishedUrl,chartLinkId} from '../chart-library';
export default function LiveChart({variant,variants,onVariant,expanded=false}){
 const host=useRef(null),onVariantRef=useRef(onVariant);
 const [ready,setReady]=useState(false),[slow,setSlow]=useState(false),[refresh,setRefresh]=useState(0);
 const url=publishedUrl(variant.id);
 useEffect(()=>{onVariantRef.current=onVariant;},[onVariant]);
 useEffect(()=>{
  const el=host.current;let active=true;setReady(false);setSlow(false);
  const timer=setTimeout(()=>{if(active)setSlow(true);},12000);
  // The official script embed brings through the current published title, description and chart.
  // Capture companion links before Datawrapper handles them, keeping comments tied to the selected view.
  function click(event){
   const link=event.composedPath().find(node=>node instanceof HTMLAnchorElement);if(!link)return;
   const id=chartLinkId(link.href,variants.map(v=>v.id));if(!id)return;
   event.preventDefault();event.stopPropagation();onVariantRef.current(id);
  }
  function rendered(){
   if(!active)return;
   const chart=el.querySelector('[id^="datawrapper-vis-"]');
   if(chart&&chart.getBoundingClientRect().height>50){setReady(true);setSlow(false);clearTimeout(timer);}
  }
  const resize=new ResizeObserver(rendered);resize.observe(el);
  const changes=new MutationObserver(rendered);changes.observe(el,{childList:true,subtree:true});
  el.addEventListener('click',click,true);
  const script=document.createElement('script');script.src=url+'embed.js?reviewRefresh='+Date.now();script.charset='utf-8';script.async=true;script.dataset.dark='false';
  script.onerror=()=>{if(active)setSlow(true);};el.appendChild(script);
  return()=>{active=false;clearTimeout(timer);changes.disconnect();resize.disconnect();el.removeEventListener('click',click,true);el.replaceChildren();};
 },[variant.id,refresh,variants]);
 const fallback=!ready&&(!variant.published||slow);
 return <div className="live-chart"><div className="live-chart-toolbar"><span role="status">{ready?'Live published chart':fallback?'Saved draft snapshot':'Loading published chart…'}</span><div><button type="button" className="text-button" onClick={()=>setRefresh(n=>n+1)}><RefreshCw size={13}/> Refresh chart</button><a href={url} target="_blank" rel="noreferrer">Open published chart <ExternalLink size={13}/></a></div></div>{fallback&&<p className="snapshot-notice">{variant.published?'The live chart has not loaded. Showing the saved snapshot.':'Showing the saved draft until a published version is available.'} Publish in Datawrapper, then refresh this chart.</p>}<div className={'live-chart-scroll '+(expanded?'live-expanded':'')}><div ref={host} className={'live-embed-host '+(fallback?'live-frame-pending':'')} aria-label={'Published chart · '+variant.label}/>{fallback&&<div className="saved-chart"><h3>{variant.title}</h3><p>{variant.takeaway}</p><img src={assetUrl(variant.image)} alt={variant.title+'. '+variant.descriptor} width={variant.width} height={variant.height}/><p className="chart-descriptor">{variant.descriptor}</p></div>}</div></div>;
}
