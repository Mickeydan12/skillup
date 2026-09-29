-- Certificate issuing + public verification. Students cannot insert certificates directly (no insert policy).
create or replace function issue_certificate(p_enrollment uuid) returns text
language plpgsql security definer set search_path=public as $$
declare e enrollments%rowtype; total int; done int; num text;
begin
  select * into e from enrollments where id=p_enrollment and user_id=auth.uid();
  if not found then raise exception 'Enrollment not found'; end if;
  select certificate_number into num from certificates where enrollment_id=e.id; if found then return num; end if;   -- idempotent
  select count(*) into total from lessons l join course_sections s on s.id=l.section_id where s.course_id=e.course_id;
  select count(*) into done from lesson_progress p join lessons l on l.id=p.lesson_id join course_sections s on s.id=l.section_id where p.enrollment_id=e.id and p.is_completed and s.course_id=e.course_id;
  if total=0 or done<total then raise exception 'Complete all lessons first'; end if;
  num := 'SUNG-'||upper(substr(md5(gen_random_uuid()::text),1,10));
  insert into certificates(user_id,course_id,enrollment_id,certificate_number) values(e.user_id,e.course_id,e.id,num);
  update enrollments set status='completed', completed_at=now() where id=e.id;
  insert into notifications(user_id,type,title,body,related_entity_type,related_entity_id) values(e.user_id,'certificate','Certificate issued','Your certificate '||num||' is ready.','certificate',e.id);
  return num;
end $$;
create or replace function verify_certificate(p_number text) returns table(full_name text, course_title text, instructor text, issued_at timestamptz, certificate_number text)
language sql stable security definer set search_path=public as $$
  select p.full_name, c.title, i.full_name, ce.issued_at, ce.certificate_number from certificates ce join profiles p on p.id=ce.user_id join courses c on c.id=ce.course_id join profiles i on i.id=c.instructor_id where ce.certificate_number=upper(p_number) $$;
revoke all on function issue_certificate(uuid) from public, anon; grant execute on function issue_certificate(uuid) to authenticated;
grant execute on function verify_certificate(text) to anon, authenticated;
