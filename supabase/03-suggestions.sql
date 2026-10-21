-- Run once after 01-schema.sql. Adds team-visible suggestions for new graphs.
begin;
create table public.review_suggestions(
 id uuid primary key default gen_random_uuid(),
 reviewer_id uuid not null references public.review_profiles(id),
 title text not null check(deleted_at is not null or length(title) between 1 and 120),
 body text not null check(length(body)<=4000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index review_suggestions_created on public.review_suggestions(created_at,id);
create index review_suggestions_reviewer on public.review_suggestions(reviewer_id);
alter table public.review_suggestions enable row level security;
revoke all on public.review_suggestions from public,anon,authenticated;
grant select on public.review_suggestions to authenticated;
create policy reviewer_suggestions_read on public.review_suggestions for select to authenticated using((select public.review_has_access()));

create function review_private.check_suggestion(p_title text,p_body text) returns void language plpgsql security definer set search_path='' as $$
 begin
 if p_title is null or length(trim(p_title)) not between 1 and 120 then raise exception 'Give the suggestion a short title (1 to 120 characters).';end if;
 if p_body is null or length(trim(p_body)) not between 1 and 4000 then raise exception 'Describe the graph in 1 to 4000 characters.';end if;
 end;
$$;
create function public.review_post_suggestion(p_title text,p_body text) returns uuid language plpgsql security definer set search_path='' as $$
 declare new_id uuid;begin
 perform review_private.require_access();perform review_private.check_suggestion(p_title,p_body);
 if not exists(select 1 from public.review_profiles where id=auth.uid()) then raise exception 'Set your reviewer name first.';end if;
 insert into public.review_suggestions(reviewer_id,title,body) values(auth.uid(),trim(p_title),trim(p_body)) returning id into new_id;
 return new_id;end;
$$;
create function public.review_edit_suggestion(p_id uuid,p_title text,p_body text) returns void language plpgsql security definer set search_path='' as $$
 begin perform review_private.require_access();perform review_private.check_suggestion(p_title,p_body);
 update public.review_suggestions set title=trim(p_title),body=trim(p_body),updated_at=now() where id=p_id and reviewer_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Only the author can edit this suggestion.' using errcode='42501';end if;
 end;
$$;
create function public.review_remove_suggestion(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
 begin perform review_private.require_access();
 update public.review_suggestions set title='',body='',deleted_at=now(),updated_at=now() where id=p_id and reviewer_id=auth.uid() and deleted_at is null;
 if not found then raise exception 'Only the author can remove this suggestion.' using errcode='42501';end if;
 end;
$$;
revoke all on function review_private.check_suggestion(text,text) from public,anon,authenticated;
revoke all on function public.review_post_suggestion(text,text),public.review_edit_suggestion(uuid,text,text),public.review_remove_suggestion(uuid) from public,anon,authenticated;
grant execute on function public.review_post_suggestion(text,text),public.review_edit_suggestion(uuid,text,text),public.review_remove_suggestion(uuid) to authenticated;
commit;
