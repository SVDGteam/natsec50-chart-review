-- Safe to run again when chart snapshots change. Keeps earlier review revisions.
begin;
update public.review_catalog set is_current=false;
insert into public.review_catalog(chart_id,revision,label,variant_ids,is_current) values
('85B2M','b0a86e5c7ffc4364','Private capital versus federal awards',array['85B2M','vYJSR'],true),
('7feFF','1eb49898d8945685','Contracts versus grants',array['B8Q58','7feFF'],true),
('QKQgp','25c712710586029a','Federal awards by agency',array['KIDgZ','QKQgp'],true),
('PqCEz','78325c94e35555fe','Government procurement categories',array['FgKYq','PqCEz'],true),
('FPVa0','b906801d21793cd6','AUKUS capability shares',array['oq1YG'],true),
('gTBY5','965a3d389c665b39','Critical technologies · capital & federal awards',array['P1tcx','gTBY5'],true),
('Riion','1900f0649edd51de','Critical technology shares',array['PxOMC','Riion'],true),
('t3Rvy','99fdc32f9249d798','Technology verticals · companies, capital & federal awards',array['WWR98','t3Rvy'],true),
('u9QBA','f3979e9c1a8916c2','Capital and contract concentration',array['4ScBj','u9QBA'],true),
('gRm6y','776df31f76cdc21d','Selected Australian defence IPOs',array['gRm6y'],true),
('mEeZT','cc41a2a68d361b8d','Global office presence',array['mEeZT'],true),
('GQJqP','0aff75b7acd2d299','Headquarters by state',array['GQJqP'],true),
('9i7n2','f93d5a4866b31891','Office presence by state',array['9i7n2'],true),
('mtZmA','ddd46b8c812a2221','Valuation by US office presence',array['mtZmA'],true),
('egzKM','4d863a51df540c05','Contributors to employment growth',array['egzKM'],true),
('hlrSA','a1a59328db8eff0c','Employment by technology',array['hlrSA'],true),
('ZmAvO','bdac17477e30c0cc','Median headcount growth',array['ZmAvO'],true),
('TXLkw','83efa4abff6669fe','Total headcount growth',array['TXLkw'],true),
('hUwiI','c9208716369f4e1d','Companies with recorded US government work',array['hUwiI'],true),
('5xplP','d50b22af63d54464','US prime obligations by agency',array['5xplP'],true),
('UT7ui','8ad55771ab4ac5c4','Cohort statistics',array['YaKjd','UT7ui'],true),
('Lkxki','8dde6c42682959ce','Ranking sensitivity to excluding grants',array['Lkxki'],true),
('aaKIA','81204ced7713318b','The Australian NatSec50 companies',array['aaKIA'],true),
('QvbtE','5dca556ffd6bd273','Investors backing the NatSec50',array['QvbtE'],true)
on conflict(chart_id,revision) do update set label=excluded.label,variant_ids=excluded.variant_ids,is_current=true;
commit;
