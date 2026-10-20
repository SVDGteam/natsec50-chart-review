"""Read-only Datawrapper snapshot import. No publish/write endpoints are called."""
import concurrent.futures,datetime,hashlib,html,importlib.util,json,re,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];WORK=ROOT.parent
spec=importlib.util.spec_from_file_location('dw',str(Path.home()/'.codex/skills/datawrapper/scripts/datawrapper.py'));dw=importlib.util.module_from_spec(spec);spec.loader.exec_module(dw)
FOLDERS={452009:('companies','Companies & statistics'),454276:('contracts','Contract type'),452018:('technology','Critical technologies'),452011:('people','Headcount growth'),454275:('investors','Investors'),454274:('capital','Private investment'),452012:('awards','Government awards'),452013:('buyers','Federal buyers'),452014:('products','Government purchases'),452010:('places','Company locations'),454530:('us','US government')}
LABELS={'85B2M':'Private capital versus federal awards','Riion':'Critical technology shares','gTBY5':'Critical technologies · federal awards','i7G14':'Critical technologies · private capital','83STT':'Technology verticals · company count','lyr0H':'Technology verticals · private capital','t3Rvy':'Technology verticals · federal awards','UT7ui':'Cohort statistics','QKQgp':'Federal awards by agency','OSRam':'Defence contracts by branch','EJ9oX':'Contract-title terms','7feFF':'Contracts versus grants','PqCEz':'Government procurement categories','FPVa0':'AUKUS capability shares','u9QBA':'Capital and contract concentration','hmGV6':'Procurement methods','Ad105':'Australian versus US government totals','Lkxki':'Ranking sensitivity to excluding grants','TXLkw':'Total headcount growth','ZmAvO':'Median headcount growth','egzKM':'Contributors to employment growth','hlrSA':'Employment by technology','GQJqP':'Headquarters by state','9i7n2':'Office presence by state','mEeZT':'Global office presence','tvxoV':'Office presence in AUKUS countries','aaKIA':'The Australian NatSec50 companies','QvbtE':'Investors backing the NatSec50','2vjDY':'AUKUS technology representation','IYjmo':'Fundraising recency','M13Os':'Selected mergers and acquisitions','gRm6y':'Selected Australian defence IPOs','hUwiI':'Companies with recorded US government work','2xdJS':'US prime obligations by company','5xplP':'US prime obligations by agency','Gt24P':'US and Australian work by company'}
def text(s):return html.unescape(re.sub(r'<[^>]*>',' ',s or '')).strip()
def snapshot():
 token=dw.credential();charts=[];offset=0
 while True:
  page=json.loads(dw.api_request('GET',f'/charts?limit=100&offset={offset}',token));charts.extend(c for c in page['list'] if c.get('folderId') in FOLDERS)
  # Relevant folders are much newer than the account's old US templates. First page includes all AUS entries.
  if not page.get('next') or not any(c.get('folderId') in FOLDERS for c in page['list']) or offset>=100:break
  offset+=100
 charts=list(concurrent.futures.ThreadPoolExecutor(max_workers=3).map(lambda c:json.loads(dw.api_request('GET','/charts/'+c['id'],token)),charts))
 (ROOT/'data/source_charts.json').write_text(json.dumps(charts,indent=2));return token,charts
# Use fresh authoritative live metadata from the bounded account listing.
token,charts=snapshot();by={c['id']:c for c in charts};pairs={'85B2M':'vYJSR'}
for m in json.load(open(WORK/'outputs/datawrapper_aus_natsec50/cdc_rollout/manifest.json')):
 if m['original_id'] in by and m['id'] in by:pairs[m['original_id']]=m['id']
companions=set(pairs.values());sheets={q['chart_id']:q['sheet_id'] for q in json.load(open(WORK/'outputs/datawrapper_aus_natsec50/audit/plans.json'))};sheets['vYJSR']='1HpVdYBhkNIFEjdf386qV7kmtCTvY5Dr1FJl_lyCadqo'
for m in json.load(open(WORK/'outputs/datawrapper_aus_natsec50/cdc_rollout/manifest.json')):sheets[m['id']]=m.get('sheet_id')
# Reuse verified native US backing identities from the completed source run.
us_report=WORK/'outputs/datawrapper_usg_natsec50_2026-10-20/completion_report.json'
if us_report.exists():
 report=json.loads(us_report.read_text());keys={c['key']:c['id'] for c in report['createdCharts']}
 for sheet in report['nativeSheets']:
  imported=sheet['import']
  if imported.get('success') and sheet['key'] in keys:sheets[keys[sheet['key']]]=imported['spreadsheetId']
for c in charts:
 assert re.fullmatch('[A-Za-z0-9]{5}',c['id'])
def export(c):
 cid=c['id'];stamp=ROOT/'data'/f'{cid}.snapshot.json'
 fingerprint=hashlib.sha256(json.dumps({'metadata':c['metadata'],'title':c['title'],'lastModifiedAt':c['lastModifiedAt']},sort_keys=True).encode()).hexdigest()
 out=ROOT/'public/charts'/f'{cid}-{fingerprint[:16]}.png'
 if not (out.exists() and stamp.exists() and json.loads(stamp.read_text()).get('hash')==fingerprint and json.loads(stamp.read_text()).get('render')=='800x2'):
  b=dw.api_request('GET',f'/charts/{cid}/export/png?width=800&height=auto&zoom=2&plain=true',token)
  if not b.startswith(b'\x89PNG'):raise RuntimeError('PNG export did not return an image: '+cid)
  out.write_bytes(b);stamp.write_text(json.dumps({'hash':fingerprint,'lastModifiedAt':c['lastModifiedAt'],'render':'800x2'}))
 print('Exported',cid,flush=True)
 return cid,fingerprint
hashes=dict(concurrent.futures.ThreadPoolExecutor(max_workers=3).map(export,charts));items=[]
for c in charts:
 if c['id'] in companions:continue
 ids=[c['id']]+([pairs[c['id']]] if c['id'] in pairs else []);variants=[]
 for i,cid in enumerate(ids):
  v=by[cid];intro=v['metadata'].get('describe',{}).get('intro','');desc=re.findall('<b>(.*?)</b>',intro,re.S);variants.append({'id':cid,'label':('Including CDC' if i==0 else 'Excluding CDC') if len(ids)>1 else 'Original','title':v['title'],'takeaway':text(intro.split('<br><br>')[0]),'descriptor':text(desc[-1]) if desc else '', 'image':'/charts/'+cid+'-'+hashes[cid][:16]+'.png','editor':'https://app.datawrapper.de/chart/'+cid+'/visualize','preview':'https://app.datawrapper.de/preview/'+cid,'source':('https://docs.google.com/spreadsheets/d/'+sheets[cid]+'/edit') if sheets.get(cid) else 'https://docs.google.com/spreadsheets/d/1-pglM6wn91LFFsXiEZ050ne237bV1sGtD92L-xvq4gM/edit','updatedAt':v['lastModifiedAt']})
  # Canvas ratio is served with each image so page layout reserves the correct height.
  import struct
  w,h=struct.unpack('>II',(ROOT/'public/charts'/f'{cid}-{hashes[cid][:16]}.png').read_bytes()[16:24]);variants[-1].update({'width':w,'height':h})
 key,category=FOLDERS[c['folderId']];revision=hashlib.sha256('|'.join(hashes[x] for x in ids).encode()).hexdigest()[:16]
 items.append({'id':c['id'],'label':LABELS.get(c['id'],c['title']),'categoryId':key,'category':category,'revision':revision,'variants':variants,'order':0 if c['id']=='85B2M' else 1})
items.sort(key=lambda x:(x['order'],x['category'],x['label']));catalog={'title':'Australian NatSec50','capturedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'chartCount':len(charts),'analysisCount':len(items),'pairCount':sum(len(i['variants'])>1 for i in items),'items':items}
(ROOT/'data/catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2));print(json.dumps({k:v for k,v in catalog.items() if k!='items'}))
