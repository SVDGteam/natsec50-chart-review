import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const schema=readFileSync(new URL('../supabase/01-schema.sql',import.meta.url),'utf8');
const seed=readFileSync(new URL('../supabase/02-catalog.sql',import.meta.url),'utf8');
const suggestions=readFileSync(new URL('../supabase/03-suggestions.sql',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
const alice='00000000-0000-4000-8000-000000000001',bob='00000000-0000-4000-8000-000000000002',outsider='00000000-0000-4000-8000-000000000003';
test('Postgres RLS and review functions enforce team membership, ownership, revision and reply rules',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('email',current_setting('request.jwt.claim.email',true))$$;grant usage on schema auth to authenticated;grant execute on all functions in schema auth to authenticated;`);
 await db.exec(schema);await db.exec(seed);await db.exec(seed);await db.exec(suggestions);
 assert.equal((await db.query('select count(*)::int n from review_catalog where is_current')).rows[0].n,catalog.analysisCount);
 await db.query('insert into auth.users values($1),($2),($3)',[alice,bob,outsider]);
 await db.exec("insert into review_private.allowed_emails values('alice@example.com'),('bob@example.com')");
 async function as(id,email){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.email',$2,false)",[id,email]);await db.exec('set role authenticated');}
 const chart=(await db.query('select * from review_catalog where cardinality(variant_ids)>1 limit 1')).rows[0];
 async function vote(patch,revision=chart.revision){return db.query('select review_set_vote($1,$2,$3::jsonb)',[chart.chart_id,revision,JSON.stringify(patch)]);}
 await db.exec('set role anon');await assert.rejects(db.query('select * from review_votes'),/permission denied/);await assert.rejects(db.query('select review_set_name($1)',['Fake']),/permission denied/);
 await as(outsider,'outside@example.com');assert.equal((await db.query('select count(*)::int n from review_catalog')).rows[0].n,0);await assert.rejects(db.query('select review_set_name($1)',['Outsider']),/access required/);
 await as(alice,'alice@example.com');await db.query('select review_set_name($1)',['Alice']);await vote({vote:1});await vote({vote:1});assert.equal((await db.query('select count(*)::int n from review_votes')).rows[0].n,1);await vote({preference:chart.variant_ids[1]});assert.equal((await db.query('select vote from review_votes')).rows[0].vote,1);await vote({vote:-1});assert.equal((await db.query('select preference from review_votes')).rows[0].preference,chart.variant_ids[1]);
 await assert.rejects(vote({vote:2}),/Invalid vote/);await assert.rejects(vote({vote:true}),/Invalid vote/);await assert.rejects(vote({preference:'invented'}),/Invalid preferred/);await assert.rejects(vote({vote:1},'old'),/changed/);await assert.rejects(db.query('update review_votes set vote=1'),/permission denied/);
 const parent=(await db.query('select review_post_comment($1,$2,$3,$4,null) id',[chart.chart_id,chart.revision,chart.variant_ids[1],'Keep this chart'])).rows[0].id;
 await as(bob,'bob@example.com');await db.query('select review_set_name($1)',['Bob']);await vote({vote:-1});assert.equal((await db.query('select count(*)::int n from review_votes')).rows[0].n,2);
 await assert.rejects(db.query('select review_edit_comment($1,$2)',[parent,'stolen']),/Only the author/);await assert.rejects(db.query('select review_remove_comment($1)',[parent]),/Only the author/);
 const reply=(await db.query('select review_post_comment($1,$2,$3,$4,$5) id',[chart.chart_id,chart.revision,chart.variant_ids[1],'Agree',parent])).rows[0].id;
 await assert.rejects(db.query('select review_post_comment($1,$2,$3,$4,$5)',[chart.chart_id,chart.revision,chart.variant_ids[0],'Wrong variant',parent]),/Invalid reply/);
 await assert.rejects(db.query('select review_post_comment($1,$2,$3,$4,$5)',[chart.chart_id,chart.revision,chart.variant_ids[1],'Nested reply',reply]),/Invalid reply/);
 await as(alice,'alice@example.com');await db.query('select review_edit_comment($1,$2)',[parent,'Changed mind']);await db.query('select review_remove_comment($1)',[parent]);const cs=(await db.query('select * from review_comments')).rows;assert.equal(cs.find(c=>c.id===parent).body,'');assert.ok(cs.find(c=>c.id===parent).deleted_at);assert.equal(cs.find(c=>c.id===reply).body,'Agree');await vote({vote:null});assert.equal((await db.query('select vote from review_votes where reviewer_id=$1',[alice])).rows[0].vote,null);
 const sid=(await db.query('select review_post_suggestion($1,$2) id',['Awards per employee','Federal awards divided by headcount, by technology area'])).rows[0].id;
 await assert.rejects(db.query('select review_post_suggestion($1,$2)',['',' body']),/short title/);await assert.rejects(db.query("insert into review_suggestions(reviewer_id,title,body) values($1,'x','y')",[alice]),/permission denied/);
 await as(bob,'bob@example.com');assert.equal((await db.query('select title from review_suggestions')).rows[0].title,'Awards per employee');await assert.rejects(db.query('select review_edit_suggestion($1,$2,$3)',[sid,'Hijack','x']),/Only the author/);await assert.rejects(db.query('select review_remove_suggestion($1)',[sid]),/Only the author/);
 await as(outsider,'outside@example.com');assert.equal((await db.query('select count(*)::int n from review_suggestions')).rows[0].n,0);await assert.rejects(db.query('select review_post_suggestion($1,$2)',['x','y']),/access required/);
 await as(alice,'alice@example.com');await db.query('select review_edit_suggestion($1,$2,$3)',[sid,'Awards per employee (AUD)','Updated']);await db.query('select review_remove_suggestion($1)',[sid]);assert.ok((await db.query('select deleted_at from review_suggestions')).rows[0].deleted_at);
 await db.exec('reset role');await db.exec("delete from review_private.allowed_emails where email='alice@example.com'");await as(alice,'alice@example.com');assert.equal((await db.query('select count(*)::int n from review_comments')).rows[0].n,0);await assert.rejects(vote({vote:1}),/access required/);
 }finally{await db.close();}
});
