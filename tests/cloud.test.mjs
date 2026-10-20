import test from 'node:test';
import assert from 'node:assert/strict';
import {aggregate,toCsv} from '../src/review-model.js';
const catalog={items:[{id:'abc12',revision:'r1'},{id:'xyz34',revision:'r1'}]};
test('team counts share one analysis across variants, separate preferences and ignore earlier revisions',()=>{
 const reviews=[{chart_id:'abc12',revision:'r1',reviewer_id:'a',vote:1,preference:'v2'},{chart_id:'abc12',revision:'r1',reviewer_id:'b',vote:-1,preference:'either'},{chart_id:'abc12',revision:'old',reviewer_id:'a',vote:1}];
 const comments=[{chart_id:'abc12',revision:'r1'},{chart_id:'abc12',revision:'r1',deleted_at:'now'},{chart_id:'xyz34',revision:'old'}];
 const state=aggregate(catalog,reviews,comments,'a');assert.deepEqual(state.stats.abc12,{up:1,down:1,comments:1,preferences:{v2:1,either:1}});assert.equal(state.mine.abc12.vote,1);assert.equal(state.stats.xyz34.comments,0);
});
test('CSV escapes quotes, newlines and spreadsheet formulas',()=>{const csv=toCsv([['Name','Text'],['=SUM(1,2)','a,"b"\nc'],[' +cmd','normal']]);assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('a,""b""\nc'));assert.ok(csv.includes('"\' +cmd"'));});

import {groups,orderItems,publishedUrl,chartLinkId} from '../src/chart-library.js';
test('all analyses follow sidebar subject order and keep their within-subject order',()=>{
 const items=[{id:1,categoryId:'investors'},{id:2,categoryId:'technology'},{id:3,categoryId:'awards'},{id:4,categoryId:'contracts'},{id:5,categoryId:'people'},{id:6,categoryId:'us'},{id:7,categoryId:'capital'}];
 assert.deepEqual(orderItems(items).map(x=>x.id),[3,4,2,7,5,6,1]);assert.equal(groups[1].id,'government');assert.equal(groups.at(-1).id,'other');assert.equal(items[0].id,1);
});
test('published URLs stay versionless and companion links only select known charts on trusted hosts',()=>{
 assert.equal(publishedUrl('85B2M'),'https://datawrapper.dwcdn.net/85B2M/');assert.throws(()=>publishedUrl('../escape'));
 assert.equal(chartLinkId('https://app.datawrapper.de/preview/vYJSR',['85B2M','vYJSR']),'vYJSR');
 assert.equal(chartLinkId('https://datawrapper.dwcdn.net/vYJSR/3/',['85B2M','vYJSR']),'vYJSR');
 assert.equal(chartLinkId('https://evil.example/preview/vYJSR',['vYJSR']),null);assert.equal(chartLinkId('javascript:alert(1)',['vYJSR']),null);assert.equal(chartLinkId('https://app.datawrapper.de/preview/other',['85B2M']),null);
});
