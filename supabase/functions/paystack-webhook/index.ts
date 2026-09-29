import { settle } from '../_shared/common.ts';
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
Deno.serve(async (req) => {
  const raw = await req.text();
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('PAYSTACK_SECRET_KEY')!), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw)));
  if (sig !== req.headers.get('x-paystack-signature')) return new Response('invalid signature', { status: 401 });
  const evt = JSON.parse(raw);
  if (evt.event === 'charge.success') await settle(evt.data.reference);   // idempotent; duplicates return 'already_fulfilled'
  return new Response('ok', { status: 200 });
});
