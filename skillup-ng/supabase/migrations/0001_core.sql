-- SkillUp NG core schema (subset). Safe to re-run on a clean project.
create extension if not exists pgcrypto;
create table if not exists profiles(id uuid primary key references auth.users on delete cascade, username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  full_name text, avatar_url text, headline text, bio text, country text default 'Nigeria', city text,
  account_status text not null default 'active' check (account_status in ('active','suspended')), onboarding_completed boolean default false,
  created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists user_roles(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade,
  role text not null check (role in ('student','instructor','employer','admin')), created_at timestamptz default now(), unique(user_id,role));
create table if not exists categories(id uuid primary key default gen_random_uuid(), name text not null, slug text unique not null, description text, icon text, parent_id uuid references categories, is_active boolean default true);
create table if not exists courses(id uuid primary key default gen_random_uuid(), instructor_id uuid not null references profiles, category_id uuid references categories,
  title text not null, slug text unique not null, short_description text, description text, thumbnail_url text, trailer_url text,
  level text default 'beginner' check (level in ('beginner','intermediate','advanced')), language text default 'English',
  price numeric(12,2) default 0 check (price>=0), currency text default 'NGN', is_free boolean default true,
  status text not null default 'draft' check (status in ('draft','pending_review','published','rejected','archived')), rejection_reason text,
  published_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists course_sections(id uuid primary key default gen_random_uuid(), course_id uuid not null references courses on delete cascade, title text not null, position int default 0);
create table if not exists lessons(id uuid primary key default gen_random_uuid(), section_id uuid not null references course_sections on delete cascade, title text not null,
  lesson_type text default 'video' check (lesson_type in ('video','text','pdf','quiz')), video_url text, content text, duration_seconds int default 0, position int default 0, is_preview boolean default false);
create table if not exists payments(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles, amount numeric(12,2) not null, currency text default 'NGN',
  payment_provider text default 'paystack', provider_reference text unique, payment_type text, status text default 'pending' check (status in ('pending','success','failed','abandoned')), metadata jsonb, verified_at timestamptz, created_at timestamptz default now());
create table if not exists enrollments(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles, course_id uuid not null references courses, payment_id uuid references payments,
  enrolled_at timestamptz default now(), completed_at timestamptz, status text default 'active' check (status in ('active','completed','refunded')), unique(user_id,course_id));
create table if not exists lesson_progress(id uuid primary key default gen_random_uuid(), enrollment_id uuid not null references enrollments on delete cascade, lesson_id uuid not null references lessons on delete cascade,
  is_completed boolean default false, completed_at timestamptz, last_position_seconds int default 0, updated_at timestamptz default now(), unique(enrollment_id,lesson_id));
create table if not exists certificates(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles, course_id uuid not null references courses, enrollment_id uuid unique references enrollments,
  certificate_number text unique not null, issued_at timestamptz default now());
create table if not exists jobs(id uuid primary key default gen_random_uuid(), client_id uuid not null references profiles, title text not null, description text, category_id uuid references categories,
  job_type text default 'fixed_price', budget_type text, budget_min numeric(12,2), budget_max numeric(12,2), currency text default 'NGN', experience_level text, location text, is_remote boolean default true,
  status text not null default 'draft' check (status in ('draft','published','paused','closed','suspended')), deadline date, created_at timestamptz default now(), updated_at timestamptz default now());
create table if not exists job_applications(id uuid primary key default gen_random_uuid(), job_id uuid not null references jobs on delete cascade, freelancer_id uuid not null references profiles,
  cover_letter text not null, proposed_budget numeric(12,2), estimated_delivery_days int, status text default 'submitted' check (status in ('submitted','under_review','shortlisted','interview','accepted','rejected','withdrawn')),
  created_at timestamptz default now(), updated_at timestamptz default now(), unique(job_id,freelancer_id));
create table if not exists saved_jobs(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, job_id uuid not null references jobs on delete cascade, unique(user_id,job_id));
create table if not exists notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references profiles on delete cascade, type text, title text, body text, related_entity_type text, related_entity_id uuid, is_read boolean default false, created_at timestamptz default now());
create index if not exists idx_courses_status on courses(status,published_at desc);
create index if not exists idx_jobs_status on jobs(status,created_at desc);
create index if not exists idx_notif_user on notifications(user_id,is_read);

-- Trusted helpers (fixed search_path)
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select exists(select 1 from user_roles where user_id=auth.uid() and role='admin') $$;
create or replace function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin foreach t in array array['profiles','courses','jobs','job_applications'] loop
  execute format('drop trigger if exists trg_touch on %I; create trigger trg_touch before update on %I for each row execute function touch_updated()',t,t); end loop; end $$;

-- Profile + role creation on signup. Only 'student' or 'employer' can be self-selected; admin/instructor are never granted here.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare r text := case when new.raw_user_meta_data->>'requested_role'='employer' then 'employer' else 'student' end;
begin
  insert into profiles(id,full_name,username) values(new.id,new.raw_user_meta_data->>'full_name',lower(new.raw_user_meta_data->>'username'));
  insert into user_roles(user_id,role) values(new.id,r);
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Block users from changing protected profile fields
create or replace function guard_profile() returns trigger language plpgsql as $$
begin if not is_admin() and new.account_status is distinct from old.account_status then new.account_status:=old.account_status; end if; return new; end $$;
drop trigger if exists trg_guard_profile on profiles; create trigger trg_guard_profile before update on profiles for each row execute function guard_profile();

-- RLS
do $$ declare t text; begin foreach t in array array['profiles','user_roles','categories','courses','course_sections','lessons','payments','enrollments','lesson_progress','certificates','jobs','job_applications','saved_jobs','notifications'] loop
  execute format('alter table %I enable row level security',t); end loop; end $$;
create policy "profiles public read" on profiles for select using (account_status='active' or id=auth.uid() or is_admin());
create policy "profiles self update" on profiles for update using (id=auth.uid()) with check (id=auth.uid());
create policy "roles self read" on user_roles for select using (user_id=auth.uid() or is_admin());  -- no client insert/update: roles are server-managed
create policy "categories public read" on categories for select using (true);
create policy "categories admin write" on categories for all using (is_admin()) with check (is_admin());
create policy "courses read" on courses for select using (status='published' or instructor_id=auth.uid() or is_admin());
create policy "courses instructor insert" on courses for insert with check (instructor_id=auth.uid() and exists(select 1 from user_roles where user_id=auth.uid() and role='instructor') and status in ('draft','pending_review'));
create policy "courses instructor update" on courses for update using (instructor_id=auth.uid() and status<>'published') with check (instructor_id=auth.uid() and status in ('draft','pending_review'));
create policy "courses admin" on courses for all using (is_admin()) with check (is_admin());
create policy "sections read" on course_sections for select using (exists(select 1 from courses c where c.id=course_id and (c.status='published' or c.instructor_id=auth.uid() or is_admin())));
create policy "sections owner write" on course_sections for all using (exists(select 1 from courses c where c.id=course_id and c.instructor_id=auth.uid())) with check (exists(select 1 from courses c where c.id=course_id and c.instructor_id=auth.uid()));
create policy "lessons read" on lessons for select using (exists(select 1 from course_sections s join courses c on c.id=s.course_id where s.id=section_id and (
  c.instructor_id=auth.uid() or is_admin() or (c.status='published' and (is_preview or exists(select 1 from enrollments e where e.course_id=c.id and e.user_id=auth.uid() and e.status<>'refunded'))))));
create policy "lessons owner write" on lessons for all using (exists(select 1 from course_sections s join courses c on c.id=s.course_id where s.id=section_id and c.instructor_id=auth.uid())) with check (exists(select 1 from course_sections s join courses c on c.id=s.course_id where s.id=section_id and c.instructor_id=auth.uid()));
create policy "payments own read" on payments for select using (user_id=auth.uid() or is_admin());  -- writes only via service role (Edge Functions)
create policy "enrollments own read" on enrollments for select using (user_id=auth.uid() or is_admin() or exists(select 1 from courses c where c.id=course_id and c.instructor_id=auth.uid()));
create policy "free enroll" on enrollments for insert with check (user_id=auth.uid() and payment_id is null and exists(select 1 from courses c where c.id=course_id and c.status='published' and c.is_free));
create policy "progress own" on lesson_progress for all using (exists(select 1 from enrollments e where e.id=enrollment_id and e.user_id=auth.uid())) with check (exists(select 1 from enrollments e where e.id=enrollment_id and e.user_id=auth.uid()));
create policy "certs own/public read" on certificates for select using (true);  -- public verification; contains no private data. Inserts only via service role.
create policy "jobs read" on jobs for select using (status='published' or client_id=auth.uid() or is_admin());
create policy "jobs employer insert" on jobs for insert with check (client_id=auth.uid() and exists(select 1 from user_roles where user_id=auth.uid() and role='employer'));
create policy "jobs owner update" on jobs for update using (client_id=auth.uid()) with check (client_id=auth.uid());
create policy "jobs admin" on jobs for all using (is_admin()) with check (is_admin());
create policy "apps read" on job_applications for select using (freelancer_id=auth.uid() or is_admin() or exists(select 1 from jobs j where j.id=job_id and j.client_id=auth.uid()));
create policy "apps apply" on job_applications for insert with check (freelancer_id=auth.uid() and status='submitted' and exists(select 1 from jobs j where j.id=job_id and j.status='published' and j.client_id<>auth.uid()));
create policy "apps freelancer withdraw" on job_applications for update using (freelancer_id=auth.uid()) with check (freelancer_id=auth.uid() and status='withdrawn');
create policy "apps client review" on job_applications for update using (exists(select 1 from jobs j where j.id=job_id and j.client_id=auth.uid())) with check (status in ('under_review','shortlisted','interview','accepted','rejected'));
create policy "saved own" on saved_jobs for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "notif own read" on notifications for select using (user_id=auth.uid());
create policy "notif own mark read" on notifications for update using (user_id=auth.uid()) with check (user_id=auth.uid());

insert into categories(name,slug) values ('Web Development','web-development'),('Frontend Development','frontend-development'),('Backend Development','backend-development'),('UI/UX Design','ui-ux-design'),('Graphic Design','graphic-design'),('Video Editing','video-editing'),('Data Analysis','data-analysis'),('Digital Marketing','digital-marketing'),('Cybersecurity','cybersecurity'),('Mobile Development','mobile-development'),('Business and Entrepreneurship','business-entrepreneurship') on conflict do nothing;
-- Create the first admin manually in the SQL editor (never via the app):
--   insert into user_roles(user_id,role) select id,'admin' from profiles where username='your_username';
