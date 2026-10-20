import {readFileSync,writeFileSync} from 'node:fs';
import {orderItems} from '../src/chart-library.js';
const catalog=JSON.parse(readFileSync(new URL('../data/catalog.json',import.meta.url),'utf8'));
catalog.items=orderItems(catalog.items);
writeFileSync(new URL('../public/catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const values=catalog.items.map(i=>`(${quote(i.id)},${quote(i.revision)},${quote(i.label)},array[${i.variants.map(v=>quote(v.id)).join(',')}],true)`);
writeFileSync(new URL('../supabase/02-catalog.sql',import.meta.url),`-- Safe to run again when chart snapshots change. Keeps earlier review revisions.\nbegin;\nupdate public.review_catalog set is_current=false;\ninsert into public.review_catalog(chart_id,revision,label,variant_ids,is_current) values\n${values.join(',\n')}\non conflict(chart_id,revision) do update set label=excluded.label,variant_ids=excluded.variant_ids,is_current=true;\ncommit;\n`);
console.log(`Prepared ${catalog.analysisCount} analyses / ${catalog.chartCount} views for hosting.`);
