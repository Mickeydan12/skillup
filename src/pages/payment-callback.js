import { supabase } from '../config/supabase.js';
import { go } from '../router.js';
// Paystack redirects here with ?reference=...; find the course, then hand off to its page which verifies server-side.
export default async function (el) {
  const ref = new URLSearchParams(location.search).get('reference');
  const { data: p } = await supabase.from('payments').select('metadata').eq('provider_reference', ref ?? '').maybeSingle();
  const cid = p?.metadata?.course_id; const { data: c } = cid ? await supabase.from('courses').select('slug').eq('id', cid).maybeSingle() : {};
  if (c?.slug) go(`/courses/${c.slug}?reference=${encodeURIComponent(ref)}`); else el.innerHTML = '<div class="wrap"><div class="err">We could not find that payment.</div></div>';
}
