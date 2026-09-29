import { admin, cors, json, userFrom } from '../_shared/common.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req); if (!user) return json({ error: 'Please log in.' }, 401);
  const { course_id } = await req.json().catch(() => ({})); if (!course_id) return json({ error: 'Missing course.' }, 400);
  const db = admin();
  const { data: c } = await db.from('courses').select('id,title,price,currency,is_free,status,instructor_id').eq('id', course_id).single();
  if (!c || c.status !== 'published') return json({ error: 'This course is not available.' }, 404);
  if (c.is_free || !(c.price > 0)) return json({ error: 'This course is free.' }, 400);
  if (c.instructor_id === user.id) return json({ error: 'You cannot buy your own course.' }, 400);
  const { data: prof } = await db.from('profiles').select('account_status').eq('id', user.id).single();
  if (prof?.account_status !== 'active') return json({ error: 'Account not active.' }, 403);
  const { data: have } = await db.from('enrollments').select('id').eq('user_id', user.id).eq('course_id', c.id).maybeSingle();
  if (have) return json({ error: 'You are already enrolled.' }, 409);
  const reference = 'SUNG_' + crypto.randomUUID().replaceAll('-', '');
  const { error } = await db.from('payments').insert({ user_id: user.id, amount: c.price, currency: 'NGN', provider_reference: reference, payment_type: 'course', metadata: { course_id: c.id } }); // price comes from DB, not browser
  if (error) return json({ error: 'Could not start payment.' }, 500);
  const res = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, amount: Math.round(c.price * 100), currency: 'NGN', reference, callback_url: `${Deno.env.get('APP_URL')}/payment/callback`, metadata: { course_id: c.id } }) });
  const out = await res.json(); if (!res.ok || !out.status) return json({ error: 'Payment provider error.' }, 502);
  return json({ authorization_url: out.data.authorization_url, reference });
});
