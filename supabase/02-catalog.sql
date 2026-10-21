-- Safe to run again when chart snapshots change. Keeps earlier review revisions.
begin;
update public.review_catalog set is_current=false;
insert into public.review_catalog(chart_id,revision,label,variant_ids,is_current) values
('85B2M','1e2c02b399b5e8f4','Private capital versus federal awards',array['85B2M','vYJSR'],true),
('7feFF','830479b370672517','Contracts versus grants',array['B8Q58','7feFF'],true),
('QKQgp','2d7cf6f9fdba5a85','Federal awards by agency',array['KIDgZ','QKQgp'],true),
('EJ9oX','d995b79d3f1b4e06','Contract-title terms',array['WYdJr','EJ9oX'],true),
('PqCEz','4dd02b11538bcf55','Government procurement categories',array['FgKYq','PqCEz'],true),
('FPVa0','f8d50ccb45182ae6','AUKUS capability shares',array['oq1YG','FPVa0'],true),
('2vjDY','d060644a621945e9','AUKUS technology representation',array['2vjDY'],true),
('gTBY5','de410dbb1ea98785','Critical technologies · capital & federal awards',array['P1tcx','gTBY5'],true),
('Riion','fb6c24e3e9e5c9f2','Critical technology shares',array['PxOMC','Riion'],true),
('t3Rvy','f95a8d69ea508ef6','Technology verticals · companies, capital & federal awards',array['WWR98','t3Rvy'],true),
('u9QBA','e13285045ed01dcf','Capital and contract concentration',array['4ScBj','u9QBA'],true),
('gRm6y','776df31f76cdc21d','Selected Australian defence IPOs',array['gRm6y'],true),
('mEeZT','a9dcada73440daf5','Global office presence',array['mEeZT'],true),
('GQJqP','f29d99324083701d','Headquarters by state',array['GQJqP'],true),
('9i7n2','e422ffff9a5a0f7b','Office presence by state',array['9i7n2'],true),
('tvxoV','13e7c6ac8d7ec237','Office presence in AUKUS countries',array['tvxoV'],true),
('egzKM','4d863a51df540c05','Contributors to employment growth',array['egzKM'],true),
('hlrSA','ee36c0ed14497a2f','Employment by technology',array['hlrSA'],true),
('ZmAvO','2e5b4a7d9492a588','Median headcount growth',array['ZmAvO'],true),
('TXLkw','f8e3e210119a2e36','Total headcount growth',array['TXLkw'],true),
('hUwiI','1ee49e0c4c2bfe48','Companies doing business with the US government',array['hUwiI'],true),
('5xplP','d50b22af63d54464','US prime obligations by agency',array['5xplP'],true),
('2xdJS','21376308a14164ac','US prime obligations by company',array['2xdJS'],true),
('UT7ui','fdca596f9b342eb4','Cohort statistics',array['YaKjd','UT7ui'],true),
('Lkxki','0516bea79c13458f','Ranking sensitivity to excluding grants',array['Lkxki'],true),
('aaKIA','3a4b111f29980338','The Australian NatSec50 companies',array['aaKIA'],true),
('QvbtE','330ce626f4ca1425','Investors backing the NatSec50',array['QvbtE'],true)
on conflict(chart_id,revision) do update set label=excluded.label,variant_ids=excluded.variant_ids,is_current=true;
commit;
