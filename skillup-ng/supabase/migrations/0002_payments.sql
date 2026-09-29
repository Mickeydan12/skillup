-- Earnings ledger, settings, and the single trusted function that grants access after payment.
create table if not exists platform_settings(id uuid primary key default gen_random_uuid(), setting_key text unique not null, setting_value jsonb not null, updated_at timestamptz default now());
insert into platform_settings(setting_key,setting_value) values ('commission_rate','0.20') on conflict do nothing;
create table if not exists instructor_earnings(id uuid primary key default gen_random_uuid(), instructor_id uuid not null references profiles, payment_id uuid unique references payments,
  gross_amount numeric(12,2) not null, platform_fee numeric(12,2) not null, instructor_amount numeric(12,2) not null, status text default 'pending' check (status in ('pending','available','paid','refunded')), created_at timestamptz default now());
alter table platform_settings enable row level security; alter table instructor_earnings enable row level security;
create policy "settings admin" on platform_settings for all using (is_admin()) with check (is_admin());
create policy "earnings own read" on instructor_earnings for select using (instructor_id=auth.uid() or is_admin());

-- Idempotent fulfilment: safe to call from both the webhook and the verify endpoint, any number of times.
create or replace function fulfill_payment(p_reference text, p_paid_kobo bigint, p_currency text) returns text
language plpgsql security definer set search_path=public as $$
declare pay payments%rowtype; c courses%rowtype; rate numeric; fee numeric;
begin
  select * into pay from payments where provider_reference=p_reference for update;   -- row lock serialises duplicate webhooks
  if not found then return 'not_found'; end if;
  if pay.status='success' then return 'already_fulfilled'; end if;
  if p_currency<>pay.currency or p_paid_kobo<>round(pay.amount*100) then update payments set status='failed' where id=pay.id; return 'amount_mismatch'; end if;
  select * into c from courses where id=(pay.metadata->>'course_id')::uuid;
  if not found then return 'course_missing'; end if;
  update payments set status='success', verified_at=now() where id=pay.id;
  insert into enrollments(user_id,course_id,payment_id) values(pay.user_id,c.id,pay.id) on conflict (user_id,course_id) do nothing;
  select coalesce((setting_value#>>'{}')::numeric,0.20) into rate from platform_settings where setting_key='commission_rate';
  fee := round(pay.amount*coalesce(rate,0.20),2);
  insert into instructor_earnings(instructor_id,payment_id,gross_amount,platform_fee,instructor_amount) values(c.instructor_id,pay.id,pay.amount,fee,pay.amount-fee) on conflict (payment_id) do nothing;
  insert into notifications(user_id,type,title,body,related_entity_type,related_entity_id) values
    (pay.user_id,'payment','Payment successful','You now have access to '||c.title,'course',c.id),
    (c.instructor_id,'enrollment','New enrollment','A student enrolled in '||c.title,'course',c.id);
  return 'fulfilled';
end $$;
revoke all on function fulfill_payment(text,bigint,text) from public, anon, authenticated;
grant execute on function fulfill_payment(text,bigint,text) to service_role;   -- browsers can never call this
