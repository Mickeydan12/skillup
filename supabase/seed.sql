-- DEMO DATA for local development only. Do not run in production.
-- Demo users have no password and cannot log in; they only own the sample content.
insert into auth.users(id,email,raw_user_meta_data,aud,role) values
 ('00000000-0000-0000-0000-00000000d001','demo.instructor@example.com','{"full_name":"Demo Instructor","username":"demo_instructor"}','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000d002','demo.employer@example.com','{"full_name":"Demo Employer","username":"demo_employer","requested_role":"employer"}','authenticated','authenticated') on conflict do nothing;
insert into user_roles(user_id,role) values ('00000000-0000-0000-0000-00000000d001','instructor') on conflict do nothing;
insert into courses(instructor_id,category_id,title,slug,short_description,level,price,is_free,status,published_at)
 select '00000000-0000-0000-0000-00000000d001',id,'[DEMO] HTML & CSS Foundations','demo-html-css','Sample course for local development.','beginner',0,true,'published',now() from categories where slug='web-development'
 union all select '00000000-0000-0000-0000-00000000d001',id,'[DEMO] UI Design Basics','demo-ui-basics','Sample paid course for local development.','intermediate',15000,false,'published',now() from categories where slug='ui-ux-design' on conflict do nothing;
insert into jobs(client_id,category_id,title,description,job_type,budget_min,budget_max,status)
 select '00000000-0000-0000-0000-00000000d002',id,'[DEMO] Landing page for a bakery','Sample job for local development.','fixed_price',50000,120000,'published' from categories where slug='web-development' on conflict do nothing;
