-- Safe to run again when chart snapshots change. Keeps earlier review revisions.
begin;
update public.review_catalog set is_current=false;
insert into public.review_catalog(chart_id,revision,label,variant_ids,is_current) values
('85B2M','1e2c02b399b5e8f4','Private capital versus federal awards',array['85B2M','vYJSR'],true),
('7feFF','830479b370672517','Contracts versus grants',array['B8Q58','7feFF'],true),
('QKQgp','2d7cf6f9fdba5a85','Federal awards by agency',array['KIDgZ','QKQgp'],true),
('PqCEz','52fffb70535a46b1','Government procurement categories',array['FgKYq','PqCEz'],true),
('FPVa0','4740831a68e61404','AUKUS capability shares',array['oq1YG'],true),
('gTBY5','281421d7473a45e6','Critical technologies · capital & federal awards',array['P1tcx','gTBY5'],true),
('Riion','fb6c24e3e9e5c9f2','Critical technology shares',array['PxOMC','Riion'],true),
('t3Rvy','f95a8d69ea508ef6','Technology verticals · companies, capital & federal awards',array['WWR98','t3Rvy'],true),
('u9QBA','e13285045ed01dcf','Capital and contract concentration',array['4ScBj','u9QBA'],true),
('gRm6y','776df31f76cdc21d','Selected Australian defence IPOs',array['gRm6y'],true),
('mEeZT','a9dcada73440daf5','Global office presence',array['mEeZT'],true),
('GQJqP','f29d99324083701d','Headquarters by state',array['GQJqP'],true),
('9i7n2','e422ffff9a5a0f7b','Office presence by state',array['9i7n2'],true),
('mtZmA','23ac8e70fad87a1a','Valuation by US office presence',array['mtZmA'],true),
('egzKM','4d863a51df540c05','Contributors to employment growth',array['egzKM'],true),
('hlrSA','ee36c0ed14497a2f','Employment by technology',array['hlrSA'],true),
('ZmAvO','1d55c52f8791bdf7','Median headcount growth',array['ZmAvO'],true),
('TXLkw','528c71692d308b50','Total headcount growth',array['TXLkw'],true),
('hUwiI','1ee49e0c4c2bfe48','Companies with recorded US government work',array['hUwiI'],true),
('5xplP','d50b22af63d54464','US prime obligations by agency',array['5xplP'],true),
('UT7ui','fdca596f9b342eb4','Cohort statistics',array['YaKjd','UT7ui'],true),
('Lkxki','0516bea79c13458f','Ranking sensitivity to excluding grants',array['Lkxki'],true),
('aaKIA','976adc7ff67cb39f','The Australian NatSec50 companies',array['aaKIA'],true),
('QvbtE','ac982d59f6c64f53','Investors backing the NatSec50',array['QvbtE'],true)
on conflict(chart_id,revision) do update set label=excluded.label,variant_ids=excluded.variant_ids,is_current=true;
commit;
