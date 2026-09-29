import { supabase } from '../config/supabase.js';
import { ngn, esc } from '../utils/format.js';
import { go } from '../router.js';
export default async function (el, { slug }, ctx) {
  const { data: c, error } = await supabase.from('courses').select('id,title,description,short_description,level,price,is_free,profiles(full_name)').eq('slug', slug).eq('status', 'published').maybeSingle();
  if (error || !c) { el.innerHTML = '<div class="wrap"><div class="empty">This course is not available.</div></div>'; return; }
  let enrolled = false;
  if (ctx.user) enrolled = !!(await supabase.from('enrollments').select('id').eq('course_id', c.id).eq('user_id', ctx.user.id).maybeSingle()).data;
  // Titles come from the public curriculum view; lesson content stays locked behind enrollment.
  const { data: rows } = await supabase.from('course_curriculum').select('*').eq('course_id', c.id);
  const map = new Map(); (rows || []).forEach(r => { if (!map.has(r.section_id)) map.set(r.section_id, { title: r.section_title, position: r.section_position, lessons: [] }); if (r.lesson_id) map.get(r.section_id).lessons.push({ title: r.lesson_title, is_preview: r.is_preview, position: r.lesson_position }); });
  const secs = [...map.values()].sort((a, b) => a.position - b.position);
  el.innerHTML = `<div class="wrap" style="padding-top:2rem"><span class="badge">${esc(c.level)}</span><h1>${esc(c.title)}</h1><p class="muted">By ${esc(c.profiles?.full_name)}</p>
   <p style="margin:1rem 0;max-width:70ch">${esc(c.description || c.short_description)}</p>
   <p><strong>${c.is_free ? 'Free' : ngn(c.price)}</strong></p><p class="msg" id="m" role="status"></p>
   <button class="btn pri" id="enroll" ${enrolled ? 'disabled' : ''}>${enrolled ? 'You are enrolled' : c.is_free ? 'Enroll for free' : 'Enroll now'}</button>
   <h2 style="margin:2rem 0 .75rem">Curriculum</h2>${secs.length ? secs.map(s => `<div class="card" style="margin-bottom:.75rem"><h3>${esc(s.title)}</h3>${(s.lessons || []).sort((a, b) => a.position - b.position).map(l => `<p class="muted">${esc(l.title)}${l.is_preview ? ' (preview)' : ''}</p>`).join('')}</div>`).join('') : '<div class="empty">The curriculum has not been added yet.</div>'}</div>`;
  const m = el.querySelector('#m'), btn = el.querySelector('#enroll');
  const say = (t, bad) => { m.className = 'msg ' + (bad ? 'bad' : 'good'); m.textContent = t; };
  // Returning from Paystack: ask the server to verify. The redirect alone never grants access.
  const ref = new URLSearchParams(location.search).get('reference');
  if (ref) { say('Confirming your payment...'); const { data } = await supabase.functions.invoke('verify-payment', { body: { reference: ref } });
    if (data?.ok) { say('Payment confirmed. You are enrolled.'); btn.disabled = true; btn.textContent = 'You are enrolled'; } else say('We could not confirm this payment yet. If you were charged, it will appear shortly.', true); }
  btn.onclick = async () => {
    if (!ctx.user) return go('/login?next=' + encodeURIComponent(location.pathname));
    btn.disabled = true;
    if (c.is_free) { const { error: e } = await supabase.from('enrollments').insert({ user_id: ctx.user.id, course_id: c.id }); // RLS allows this for free published courses only
      if (e) { say('Could not enroll. Please try again.', true); btn.disabled = false; } else go('/dashboard'); return; }
    const { data, error: e } = await supabase.functions.invoke('initialize-payment', { body: { course_id: c.id } });   // server sets the price
    if (e || !data?.authorization_url) { say(data?.error || 'Could not start payment. Please try again.', true); btn.disabled = false; } else location.href = data.authorization_url;
  };
}
