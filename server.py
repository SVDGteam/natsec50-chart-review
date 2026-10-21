#!/usr/bin/env python3
"""Local chart-review server. Python standard library + SQLite; no cloud writes."""
import argparse,csv,hashlib,http.cookies,io,json,os,re,secrets,sqlite3,time
from datetime import datetime,timezone
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse,parse_qs
ROOT=Path(__file__).resolve().parent
SCHEMA='''
CREATE TABLE IF NOT EXISTS reviewers(id TEXT PRIMARY KEY,name TEXT NOT NULL,name_key TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,reviewer_id TEXT NOT NULL REFERENCES reviewers(id),created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS snapshots(chart_id TEXT NOT NULL,revision TEXT NOT NULL,content TEXT NOT NULL,captured_at TEXT NOT NULL,PRIMARY KEY(chart_id,revision));
CREATE TABLE IF NOT EXISTS reviews(chart_id TEXT NOT NULL,revision TEXT NOT NULL,reviewer_id TEXT NOT NULL REFERENCES reviewers(id),vote INTEGER CHECK(vote IN (-1,1) OR vote IS NULL),preference TEXT,updated_at TEXT NOT NULL,PRIMARY KEY(chart_id,revision,reviewer_id));
CREATE TABLE IF NOT EXISTS comments(id TEXT PRIMARY KEY,chart_id TEXT NOT NULL,revision TEXT NOT NULL,variant_id TEXT NOT NULL,reviewer_id TEXT NOT NULL REFERENCES reviewers(id),parent_id TEXT REFERENCES comments(id),body TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);
CREATE INDEX IF NOT EXISTS comments_chart ON comments(chart_id,revision,created_at);
CREATE TABLE IF NOT EXISTS suggestions(id TEXT PRIMARY KEY,reviewer_id TEXT NOT NULL REFERENCES reviewers(id),title TEXT NOT NULL,body TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,deleted_at TEXT);
'''
def suggestion_text(data):
 title=' '.join(str(data.get('title','')).split());body=str(data.get('body','')).strip()
 if not 1<=len(title)<=120:raise ValueError('Give the suggestion a short title (1 to 120 characters).')
 if not 1<=len(body)<=4000:raise ValueError('Describe the graph in 1 to 4,000 characters.')
 return title,body
def now():return datetime.now(timezone.utc).isoformat()
def connect(path):
 db=sqlite3.connect(path,timeout=10);db.row_factory=sqlite3.Row;db.execute('PRAGMA foreign_keys=ON');return db

def initialize(path,catalog):
 path.parent.mkdir(parents=True,exist_ok=True)
 with connect(path) as db:
  db.execute('PRAGMA journal_mode=WAL');db.executescript(SCHEMA)
  for item in catalog['items']:db.execute('INSERT INTO snapshots VALUES(?,?,?,?) ON CONFLICT(chart_id,revision) DO UPDATE SET content=excluded.content',(item['id'],item['revision'],json.dumps(item),catalog['capturedAt']))
 os.chmod(path,0o600)

class ReviewHandler(SimpleHTTPRequestHandler):
 server_version='NatSecReview/0.1'
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 @property
 def catalog(self):return self.server.catalog
 @property
 def items(self):return self.server.items
 def db(self):return connect(self.server.database)
 def log_message(self,fmt,*args):
  if args and str(args[0]).startswith('GET /charts/'):return
  super().log_message(fmt,*args)
 def valid_origin(self):
  host=urlparse('http://'+self.headers.get('Host','')).hostname
  if host not in ('localhost','127.0.0.1','::1'):return False
  origin=self.headers.get('Origin')
  if origin and urlparse(origin).netloc!=self.headers.get('Host'):return False
  return True
 def json(self,data,status=200,cookie=None):
  b=json.dumps(data,ensure_ascii=False).encode();self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff')
  if cookie:self.send_header('Set-Cookie',cookie)
  self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
 def body(self):
  size=int(self.headers.get('Content-Length','0'))
  if size>24000:raise ValueError('Request is too large.')
  if 'application/json' not in self.headers.get('Content-Type',''):raise ValueError('Use a JSON request.')
  value=json.loads(self.rfile.read(size))
  if not isinstance(value,dict):raise ValueError('Expected an object.')
  return value
 def identity(self,db):
  try:
   jar=http.cookies.SimpleCookie(self.headers.get('Cookie',''));token=jar['review_session'].value
  except (KeyError,http.cookies.CookieError):return None
  return db.execute('SELECT r.id,r.name FROM reviewers r JOIN sessions s ON r.id=s.reviewer_id WHERE s.token_hash=?',(hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
 def item(self,id):
  if id not in self.items:raise ValueError('Chart not found.')
  return self.items[id]
 def do_GET(self):
  if not self.valid_origin():return self.json({'error':'This MVP accepts local requests only.'},403)
  path=urlparse(self.path).path
  try:
   if path=='/api/catalog':return self.json(self.catalog)
   if path=='/api/health':return self.json({'ok':True,'analyses':len(self.items),'charts':self.catalog['chartCount']})
   if path=='/api/state':
    with self.db() as db:
     who=self.identity(db);stats={};mine={}
     for item in self.items.values():
      params=(item['id'],item['revision']);t=db.execute('SELECT SUM(vote=1) up,SUM(vote=-1) down FROM reviews WHERE chart_id=? AND revision=?',params).fetchone();n=db.execute('SELECT COUNT(*) n FROM comments WHERE chart_id=? AND revision=? AND deleted_at IS NULL',params).fetchone()['n'];prefs={r['preference']:r['n'] for r in db.execute('SELECT preference,COUNT(*) n FROM reviews WHERE chart_id=? AND revision=? AND preference IS NOT NULL GROUP BY preference',params)}
      stats[item['id']]={'up':t['up'] or 0,'down':t['down'] or 0,'comments':n,'preferences':prefs}
      if who:
       r=db.execute('SELECT vote,preference,updated_at FROM reviews WHERE chart_id=? AND revision=? AND reviewer_id=?',(*params,who['id'])).fetchone()
       if r:mine[item['id']]=dict(r)
     return self.json({'reviewer':dict(who) if who else None,'stats':stats,'mine':mine})
   match=re.fullmatch(r'/api/charts/([A-Za-z0-9]{5})/comments',path)
   if match:
    item=self.item(match[1]);revision=parse_qs(urlparse(self.path).query).get('revision',[item['revision']])[0]
    with self.db() as db:
     rows=db.execute('SELECT c.*,r.name author FROM comments c JOIN reviewers r ON c.reviewer_id=r.id WHERE c.chart_id=? AND c.revision=? ORDER BY c.created_at,c.id',(item['id'],revision)).fetchall()
     return self.json({'comments':[{**dict(r),'body':'' if r['deleted_at'] else r['body']} for r in rows],'revision':revision})
   if path=='/api/suggestions':
    with self.db() as db:
     rows=db.execute('SELECT s.*,r.name author FROM suggestions s JOIN reviewers r ON s.reviewer_id=r.id ORDER BY s.created_at DESC,s.id').fetchall()
     return self.json({'suggestions':[{**dict(r),'title':'' if r['deleted_at'] else r['title'],'body':'' if r['deleted_at'] else r['body']} for r in rows]})
   if path=='/api/export.csv':return self.export_csv()
   if path.startswith('/api/'):return self.json({'error':'Not found.'},404)
   if path=='/':self.path='/index.html'
   return super().do_GET()
  except (ValueError,json.JSONDecodeError) as e:return self.json({'error':str(e)},400)
 def do_POST(self):return self.write_api('POST')
 def do_PATCH(self):return self.write_api('PATCH')
 def do_DELETE(self):return self.write_api('DELETE')
 def write_api(self,method):
  if not self.valid_origin():return self.json({'error':'This MVP accepts local requests only.'},403)
  path=urlparse(self.path).path
  try:
   data=self.body() if method!='DELETE' else {}
   with self.db() as db:
    if path=='/api/reviewer' and method=='POST':
     name=' '.join(str(data.get('name','')).split())
     if not 1<=len(name)<=60:raise ValueError('Enter a name between 1 and 60 characters.')
     if any(ord(c)<32 for c in name):raise ValueError('Use a plain display name.')
     key=name.casefold();row=db.execute('SELECT id,name FROM reviewers WHERE name_key=?',(key,)).fetchone()
     if not row:
      rid=secrets.token_hex(16);db.execute('INSERT INTO reviewers VALUES(?,?,?,?)',(rid,name,key,now()));row={'id':rid,'name':name}
     token=secrets.token_urlsafe(32);db.execute('INSERT INTO sessions VALUES(?,?,?)',(hashlib.sha256(token.encode()).hexdigest(),row['id'],now()));db.commit()
     return self.json({'reviewer':dict(row)},201,f'review_session={token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000')
    if path=='/api/logout' and method=='POST':
     jar=http.cookies.SimpleCookie(self.headers.get('Cookie',''))
     if 'review_session' in jar:db.execute('DELETE FROM sessions WHERE token_hash=?',(hashlib.sha256(jar['review_session'].value.encode()).hexdigest(),));db.commit()
     return self.json({'ok':True},cookie='review_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0')
    who=self.identity(db)
    if not who:return self.json({'error':'Enter your reviewer name first.'},401)
    match=re.fullmatch(r'/api/charts/([A-Za-z0-9]{5})/(review|comments)',path)
    if match and method=='POST':
     item=self.item(match[1]);revision=data.get('revision')
     if revision!=item['revision']:return self.json({'error':'The chart has changed. Refresh before reviewing it.'},409)
     if match[2]=='review':
      row=db.execute('SELECT vote,preference FROM reviews WHERE chart_id=? AND revision=? AND reviewer_id=?',(item['id'],revision,who['id'])).fetchone();vote=data.get('vote',row['vote'] if row else None);pref=data.get('preference',row['preference'] if row else None)
      if vote not in (-1,1,None) or isinstance(vote,bool):raise ValueError('Vote must be up, down or cleared.')
      allowed={v['id'] for v in item['variants']}|{'either',None}
      if (pref is not None and not isinstance(pref,str)) or pref not in allowed:raise ValueError('Choose one of this chart’s views.')
      db.execute('INSERT INTO reviews VALUES(?,?,?,?,?,?) ON CONFLICT(chart_id,revision,reviewer_id) DO UPDATE SET vote=excluded.vote,preference=excluded.preference,updated_at=excluded.updated_at',(item['id'],revision,who['id'],vote,pref,now()));db.commit();return self.json({'ok':True})
     body=str(data.get('body','')).strip();variant=data.get('variantId');parent=data.get('parentId')
     if not 1<=len(body)<=4000:raise ValueError('Write a comment between 1 and 4,000 characters.')
     if variant not in {v['id'] for v in item['variants']}:raise ValueError('Unknown chart view.')
     if parent:
      pr=db.execute('SELECT * FROM comments WHERE id=? AND chart_id=? AND revision=?',(parent,item['id'],revision)).fetchone()
      if not pr:raise ValueError('Reply target does not belong to this chart revision.')
      if pr['parent_id']:raise ValueError('Reply to the original comment instead.')
     cid=secrets.token_hex(12);stamp=now();db.execute('INSERT INTO comments VALUES(?,?,?,?,?,?,?,?,?,NULL)',(cid,item['id'],revision,variant,who['id'],parent,body,stamp,stamp));db.commit();return self.json({'id':cid},201)
    if path=='/api/suggestions' and method=='POST':
     title,body=suggestion_text(data);sid=secrets.token_hex(12);stamp=now()
     db.execute('INSERT INTO suggestions VALUES(?,?,?,?,?,?,NULL)',(sid,who['id'],title,body,stamp,stamp));db.commit();return self.json({'id':sid},201)
    sm=re.fullmatch(r'/api/suggestions/([a-f0-9]{24})',path)
    if sm and method in ('PATCH','DELETE'):
     row=db.execute('SELECT * FROM suggestions WHERE id=?',(sm[1],)).fetchone()
     if not row:return self.json({'error':'Suggestion not found.'},404)
     if row['reviewer_id']!=who['id']:return self.json({'error':'Only the author can change this suggestion.'},403)
     if row['deleted_at']:raise ValueError('This suggestion was removed.')
     if method=='DELETE':db.execute('UPDATE suggestions SET deleted_at=?,updated_at=? WHERE id=?',(now(),now(),sm[1]))
     else:
      title,body=suggestion_text(data);db.execute('UPDATE suggestions SET title=?,body=?,updated_at=? WHERE id=?',(title,body,now(),sm[1]))
     db.commit();return self.json({'ok':True})
    cm=re.fullmatch(r'/api/comments/([a-f0-9]{24})',path)
    if cm and method in ('PATCH','DELETE'):
     comment=db.execute('SELECT * FROM comments WHERE id=?',(cm[1],)).fetchone()
     if not comment:return self.json({'error':'Comment not found.'},404)
     if comment['reviewer_id']!=who['id']:return self.json({'error':'Only the author can change this comment.'},403)
     if method=='DELETE':db.execute('UPDATE comments SET deleted_at=?,updated_at=? WHERE id=?',(now(),now(),cm[1]))
     else:
      body=str(data.get('body','')).strip()
      if not 1<=len(body)<=4000:raise ValueError('Write a comment between 1 and 4,000 characters.')
      if comment['deleted_at']:raise ValueError('This comment was removed.')
      db.execute('UPDATE comments SET body=?,updated_at=? WHERE id=?',(body,now(),cm[1]))
     db.commit();return self.json({'ok':True})
    return self.json({'error':'Not found.'},404)
  except (ValueError,json.JSONDecodeError) as e:return self.json({'error':str(e)},400)
  except sqlite3.Error:return self.json({'error':'The local database is busy. Please try again.'},503)
 def export_csv(self):
  kind=parse_qs(urlparse(self.path).query).get('type',['summary'])[0];output=io.StringIO();writer=csv.writer(output)
  def safe(v):return "'"+v if isinstance(v,str) and v[:1] in ('=','+','-','@','\t','\r') else v
  with self.db() as db:
   if kind=='summary':
    header=['Analysis','Subject','Revision','Upvotes','Downvotes','Comments','Including CDC preference','Excluding CDC preference','Either view preference'];rows=[]
    for item in self.items.values():
     rev=item['revision'];t=db.execute('SELECT SUM(vote=1) u,SUM(vote=-1) d FROM reviews WHERE chart_id=? AND revision=?',(item['id'],rev)).fetchone();n=db.execute('SELECT COUNT(*) FROM comments WHERE chart_id=? AND revision=? AND deleted_at IS NULL',(item['id'],rev)).fetchone()[0];prefs={r[0]:r[1] for r in db.execute('SELECT preference,COUNT(*) FROM reviews WHERE chart_id=? AND revision=? GROUP BY preference',(item['id'],rev))};vs=item['variants'];rows.append([item['label'],item['category'],rev,t['u'] or 0,t['d'] or 0,n,prefs.get(vs[0]['id'],0),prefs.get(vs[1]['id'],0) if len(vs)>1 else '',prefs.get('either',0)])
   elif kind in ('votes','comments'):
    if kind=='votes':
     header=['Analysis ID','Revision','Reviewer','Vote','Preferred view','Updated'];rows=[list(r) for r in db.execute('SELECT v.chart_id,v.revision,r.name,v.vote,v.preference,v.updated_at FROM reviews v JOIN reviewers r ON v.reviewer_id=r.id ORDER BY v.chart_id,v.updated_at')]
    else:
     header=['Comment ID','Analysis ID','Revision','Variant','Reviewer','Parent comment','Comment','Created','Updated'];rows=[list(r) for r in db.execute('SELECT c.id,c.chart_id,c.revision,c.variant_id,r.name,c.parent_id,c.body,c.created_at,c.updated_at FROM comments c JOIN reviewers r ON c.reviewer_id=r.id WHERE c.deleted_at IS NULL ORDER BY c.created_at')]
   else:return self.json({'error':'Unknown export type.'},400)
  writer.writerow(header);writer.writerows([safe(v) for v in row] for row in rows);b=('\ufeff'+output.getvalue()).encode();self.send_response(200);self.send_header('Content-Type','text/csv; charset=utf-8');self.send_header('Content-Disposition',f'attachment; filename="natsec50-review-{kind}.csv"');self.send_header('Content-Length',str(len(b)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(b)

def create_server(port=8765,database=None):
 catalog=json.loads((ROOT/'data/catalog.json').read_text());database=Path(database or ROOT/'data/reviews.sqlite3');initialize(database,catalog);s=ThreadingHTTPServer(('127.0.0.1',port),ReviewHandler);s.database=database;s.catalog=catalog;s.items={i['id']:i for i in catalog['items']};return s
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);parser.add_argument('--database',type=Path);args=parser.parse_args()
 if not (ROOT/'dist/index.html').exists():raise SystemExit('Build the interface first: npm run build')
 server=create_server(args.port,args.database);print(f'Chart review is running at http://127.0.0.1:{server.server_port}',flush=True)
 try:server.serve_forever()
 except KeyboardInterrupt:pass
 finally:server.server_close()
