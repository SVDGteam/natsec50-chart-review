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
