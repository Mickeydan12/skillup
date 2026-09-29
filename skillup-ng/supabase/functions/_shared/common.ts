import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!); // server-only
export const cors = { 'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };
export const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
export async function userFrom(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', ''); if (!token) return null;
  const { data } = await admin().auth.getUser(token); return data.user;
}
// Always re-verify with Paystack; never trust browser or webhook payload amounts.
export async function paystackVerify(ref: string) {
  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } });
  return r.ok ? (await r.json()).data : null;
}
export async function settle(ref: string) {
  const tx = await paystackVerify(ref); if (!tx) return 'verify_failed';
  if (tx.status !== 'success') { await admin().from('payments').update({ status: tx.status === 'abandoned' ? 'abandoned' : 'failed' }).eq('provider_reference', ref).eq('status', 'pending'); return tx.status; }
  const { data, error } = await admin().rpc('fulfill_payment', { p_reference: ref, p_paid_kobo: tx.amount, p_currency: tx.currency });
  return error ? 'error' : data;
}
