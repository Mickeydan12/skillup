-- Instructor onboarding, course moderation, audit log, public curriculum.
create table if not exists role_requests(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, requested_role text not null check (requested_role in ('instructor','employer')),
  note text, status text default 'pending' check (status in ('pending','approved','rejected')), reviewed_by uuid references profiles, created_at timestamptz default now());
create unique index if not exists one_pending_request on role_requests(user_id,requested_role) where status='pending';
create table if not exists admin_audit_logs(id uuid primary key default gen_random_uuid(), admin_id uuid references profiles, action text not null, target_type text, target_id uuid, metadata jsonb, created_at timestamptz default now());
alter table role_requests enable row level security; alter table admin_audit_logs enable row level security;
create policy "rr own read" on role_requests for select using (user_id=auth.uid() or is_admin());
create policy "rr own insert" on role_requests for insert with check (user_id=auth.uid() and status='pending');
create policy "audit admin read" on admin_audit_logs for select using (is_admin());   -- inserts only through the RPCs below

-- A course needs at least one lesson before it can be submitted for review.
create or replace function guard_course_submit() returns trigger language plpgsql as $$
begin
  if new.status='pending_review' and old.status is distinct from 'pending_review' and not exists(select 1 from lessons l join course_sections s on s.id=l.section_id where s.course_id=new.id) then
    raise exception 'Add at least one lesson before submitting for review'; end if;
  if new.status='pending_review' then new.rejection_reason:=null; end if;
  return new;
end $$;
drop trigger if exists trg_course_submit on courses; create trigger trg_course_submit before update on courses for each row execute function guard_course_submit();

create or replace function admin_review_course(p_course uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path=public as $$
declare c courses%rowtype;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into c from courses where id=p_course and status='pending_review'; if not found then raise exception 'Course is not pending review'; end if;
  if not p_approve and coalesce(trim(p_reason),'')='' then raise exception 'A rejection reason is required'; end if;
  update courses set status=case when p_approve then 'published' else 'rejected' end, published_at=case when p_approve then now() else null end, rejection_reason=case when p_approve then null else p_reason end where id=p_course;
  insert into notifications(user_id,type,title,body,related_entity_type,related_entity_id) values(c.instructor_id,'course_review',case when p_approve then 'Course approved' else 'Course rejected' end,
    case when p_approve then c.title||' is now published.' else c.title||' was rejected: '||p_reason end,'course',c.id);
  insert into admin_audit_logs(admin_id,action,target_type,target_id,metadata) values(auth.uid(),case when p_approve then 'course_approved' else 'course_rejected' end,'course',c.id,jsonb_build_object('reason',p_reason));
end $$;
create or replace function admin_review_role_request(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path=public as $$
declare r role_requests%rowtype;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into r from role_requests where id=p_request and status='pending'; if not found then raise exception 'Request not pending'; end if;
  update role_requests set status=case when p_approve then 'approved' else 'rejected' end, reviewed_by=auth.uid() where id=p_request;
  if p_approve then insert into user_roles(user_id,role) values(r.user_id,r.requested_role) on conflict do nothing; end if;
  insert into notifications(user_id,type,title,body) values(r.user_id,'role_request',case when p_approve then 'Request approved' else 'Request declined' end,'Your '||r.requested_role||' request was '||case when p_approve then 'approved. Log out and back in to see it.' else 'declined.' end);
  insert into admin_audit_logs(admin_id,action,target_type,target_id,metadata) values(auth.uid(),'role_request_'||case when p_approve then 'approved' else 'rejected' end,'user',r.user_id,jsonb_build_object('role',r.requested_role));
end $$;
revoke all on function admin_review_course(uuid,boolean,text), admin_review_role_request(uuid,boolean) from public, anon;
grant execute on function admin_review_course(uuid,boolean,text), admin_review_role_request(uuid,boolean) to authenticated;   -- each re-checks is_admin() inside

-- Public curriculum: titles/durations only (never video URLs or content) for published courses.
create or replace view course_curriculum as
  select s.course_id, s.id as section_id, s.title as section_title, s.position as section_position, l.id as lesson_id, l.title as lesson_title, l.lesson_type, l.duration_seconds, l.is_preview, l.position as lesson_position
  from course_sections s join courses c on c.id=s.course_id and c.status='published' left join lessons l on l.section_id=s.id;
grant select on course_curriculum to anon, authenticated;
