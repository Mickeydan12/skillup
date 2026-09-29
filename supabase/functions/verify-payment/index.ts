import { admin, cors, json, settle, userFrom } from '../_shared/common.ts';
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const user = await userFrom(req); if (!user) return json({ error: 'Please log in.' }, 401);
  const { reference } = await req.json().catch(() => ({}));
  const { data: p } = await admin().from('payments').select('user_id').eq('provider_reference', reference ?? '').maybeSingle();
  if (!p || p.user_id !== user.id) return json({ error: 'Payment not found.' }, 404);   // only the payer can trigger verification
  const result = await settle(reference);
  return json({ result, ok: result === 'fulfilled' || result === 'already_fulfilled' });
});
