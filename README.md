# SkillUp NG (foundation build)
Vanilla JS + Vite + Supabase. See `.env.example`.

## Run
1. Create a Supabase project. Run `supabase/migrations/0001_core.sql` in the SQL editor.
2. `cp .env.example .env` and fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. `npm install && npm run dev` → http://localhost:5173
4. Auth → URL config: set Site URL `http://localhost:5173`, keep email confirmation on.

## First admin
Sign up normally, then in the SQL editor: `insert into user_roles(user_id,role) select id,'admin' from profiles where username='YOU';`

## Frontend-safe vs server-only
Only `VITE_*` values reach the browser. `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY`, `RESEND_API_KEY` are for Edge Function secrets only.

## Not built yet
See the implementation status in the chat reply.

## Paystack test mode (Workflow F)
1. Run `supabase/migrations/0002_payments.sql`.
2. `supabase secrets set PAYSTACK_SECRET_KEY=sk_test_... APP_URL=http://localhost:5173`
3. `supabase functions deploy initialize-payment verify-payment paystack-webhook`
4. Paystack dashboard → Settings → API → Webhook URL: `https://<project-ref>.supabase.co/functions/v1/paystack-webhook`
5. Buy a course with a Paystack test card. Access is granted only after the server verifies the transaction.

## Instructor + moderation (Workflow B)
Run `supabase/migrations/0003_instructor_admin.sql`. Flow: user requests instructor access on `/dashboard/instructor/courses` → admin approves at `/dashboard/admin` → user logs out/in → creates a course, adds sections and lessons, submits → admin approves or rejects with a reason. Instructors can never set a course to `published` themselves; only `admin_review_course` can.
