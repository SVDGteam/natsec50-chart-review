-- Run once in a NEW Supabase project's SQL Editor. Uses the built-in auth schema.
begin;
create schema if not exists review_private;
revoke all on schema review_private from public, anon, authenticated;
create table review_private.allowed_emails(email text primary key check(email=lower(trim(email))));

create table public.review_catalog(
 chart_id text not null, revision text not null, label text not null,
 variant_ids text[] not null check(cardinality(variant_ids)>0),
 is_current boolean not null default true,
 primary key(chart_id,revision)
);
create unique index review_catalog_one_current on public.review_catalog(chart_id) where is_current;
create table public.review_profiles(
 id uuid primary key references auth.users(id),
 name text not null check(length(trim(name)) between 1 and 60)
);
create table public.review_votes(
 chart_id text not null, revision text not null,
 reviewer_id uuid not null references public.review_profiles(id),
 vote smallint check(vote in (-1,1)), preference text,
 updated_at timestamptz not null default now(),
 primary key(chart_id,revision,reviewer_id),
 foreign key(chart_id,revision) references public.review_catalog(chart_id,revision)
);
create index review_votes_reviewer on public.review_votes(reviewer_id);
create table public.review_comments(
 id uuid primary key default gen_random_uuid(),
 chart_id text not null, revision text not null, variant_id text not null,
 reviewer_id uuid not null references public.review_profiles(id),
 parent_id uuid references public.review_comments(id),
 body text not null check(length(body)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),deleted_at timestamptz,
 foreign key(chart_id,revision) references public.review_catalog(chart_id,revision)
);
create index review_comments_analysis on public.review_comments(chart_id,revision,created_at,id);
create index review_comments_reviewer on public.review_comments(reviewer_id);
create index review_comments_parent on public.review_comments(parent_id);

-- Email access list is deliberately outside the exposed public schema.
create function public.review_has_access() returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from review_private.allowed_emails where email=lower(auth.jwt()->>'email'));
$$;

alter table public.review_catalog enable row level security;
alter table public.review_profiles enable row level security;
alter table public.review_votes enable row level security;
alter table public.review_comments enable row level security;
revoke all on public.review_catalog,public.review_profiles,public.review_votes,public.review_comments from public,anon,authenticated;
grant select on public.review_catalog,public.review_profiles,public.review_votes,public.review_comments to authenticated;
create policy reviewer_catalog_read on public.review_catalog for select to authenticated using((select public.review_has_access()));
create policy reviewer_profiles_read on public.review_profiles for select to authenticated using((select public.review_has_access()));
create policy reviewer_votes_read on public.review_votes for select to authenticated using((select public.review_has_access()));
create policy reviewer_comments_read on public.review_comments for select to authenticated using((select public.review_has_access()));

-- Mutations go through narrowly scoped functions, never a browser service-role key.
create function review_private.require_access() returns void language plpgsql security definer set search_path='' as $$
 begin if not public.review_has_access() then raise exception 'Reviewer access required' using errcode='42501';end if;end;
$$;
create function review_private.require_current(p_chart_id text,p_revision text) returns text[] language plpgsql security definer set search_path='' as $$
 declare variants text[];begin
 select variant_ids into variants from public.review_catalog where chart_id=p_chart_id and revision=p_revision and is_current;
 if not found then raise exception 'This chart has changed. Reload before reviewing.';end if;
 return variants;end;
$$;
create function public.review_set_name(p_name text) returns void language plpgsql security definer set search_path='' as $$
 begin perform review_private.require_access();
 if p_name is null or length(trim(p_name)) not between 1 and 60 then raise exception 'Enter a name between 1 and 60 characters.';end if;
 insert into public.review_profiles(id,name) values(auth.uid(),trim(p_name)) on conflict(id) do update set name=excluded.name;
 end;
$$;
create function public.review_set_vote(p_chart_id text,p_revision text,p_patch jsonb) returns void language plpgsql security definer set search_path='' as $$
 declare variants text[];v smallint;pref text;begin
 perform review_private.require_access();variants:=review_private.require_current(p_chart_id,p_revision);
 if p_patch is null or jsonb_typeof(p_patch)<>'object' or not(p_patch ? 'vote' or p_patch ? 'preference') then raise exception 'No review change supplied';end if;
 if p_patch ? 'vote' and p_patch->'vote'<>'null'::jsonb and p_patch->'vote' not in ('1'::jsonb,'-1'::jsonb) then raise exception 'Invalid vote';end if;
 v:=(p_patch->>'vote')::smallint;pref:=p_patch->>'preference';
 if p_patch ? 'preference' and pref is not null and (cardinality(variants)<2 or (pref<>'either' and not(pref=any(variants)))) then raise exception 'Invalid preferred view';end if;
 insert into public.review_votes(chart_id,revision,reviewer_id,vote,preference) values(p_chart_id,p_revision,auth.uid(),v,pref)
 on conflict(chart_id,revision,reviewer_id) do update set
 vote=case when p_patch ? 'vote' then excluded.vote else review_votes.vote end,
 preference=case when p_patch ? 'preference' then excluded.preference else review_votes.preference end,
 updated_at=now();
 end;
$$;
create function public.review_post_comment(p_chart_id text,p_revision text,p_variant text,p_body text,p_parent uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
 declare variants text[];parent public.review_comments;new_id uuid;begin
 perform review_private.require_access();variants:=review_private.require_current(p_chart_id,p_revision);
 if p_variant is null or not(p_variant=any(variants)) then raise exception 'Invalid chart view';end if;
 if p_body is null or length(trim(p_body)) not between 1 and 4000 then raise exception 'Comments must contain 1 to 4000 characters.';end if;
 if p_parent is not null then
 select * into parent from public.review_comments where id=p_parent;
 if not found or parent.chart_id<>p_chart_id or parent.revision<>p_revision or parent.variant_id<>p_variant or parent.parent_id is not null or parent.deleted_at is not null then raise exception 'Invalid reply target';end if;
 end if;
 insert into public.review_comments(chart_id,revision,variant_id,reviewer_id,parent_id,body) values(p_chart_id,p_revision,p_variant,auth.uid(),p_parent,trim(p_body)) returning id into new_id;
 return new_id;end;
$$;
create function public.review_edit_comment(p_id uuid,p_body text) returns void language plpgsql security definer set search_path='' as $$
 declare c public.review_comments;begin
 perform review_private.require_access();
 select * into c from public.review_comments where id=p_id and reviewer_id=auth.uid() and deleted_at is null for update;
 if not found then raise exception 'Only the author can edit this comment.' using errcode='42501';end if;
 perform review_private.require_current(c.chart_id,c.revision);
 if p_body is null or length(trim(p_body)) not between 1 and 4000 then raise exception 'Comments must contain 1 to 4000 characters.';end if;
 update public.review_comments set body=trim(p_body),updated_at=now() where id=p_id;
 end;
$$;
create function public.review_remove_comment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
 begin perform review_private.require_access();
 update public.review_comments set body='',deleted_at=now(),updated_at=now() where id=p_id and reviewer_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Only the author can remove this comment.' using errcode='42501';end if;
 end;
$$;
revoke all on all functions in schema review_private from public,anon,authenticated;
revoke all on function public.review_has_access(),public.review_set_name(text),public.review_set_vote(text,text,jsonb),public.review_post_comment(text,text,text,text,uuid),public.review_edit_comment(uuid,text),public.review_remove_comment(uuid) from public,anon,authenticated;
grant execute on function public.review_has_access(),public.review_set_name(text),public.review_set_vote(text,text,jsonb),public.review_post_comment(text,text,text,text,uuid),public.review_edit_comment(uuid,text),public.review_remove_comment(uuid) to authenticated;
commit;
