import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
export default async function (el, { number }) {
  const { data, error } = await supabase.rpc('verify_certificate', { p_number: number });
  const c = data?.[0];
  el.innerHTML = `<div class="wrap" style="padding-top:2rem;max-width:640px">${error ? '<div class="err">Could not check this certificate right now.</div>' : !c ? '<div class="empty"><h2>Certificate not found</h2><p>Check the number and try again.</p></div>' :
   `<div class="cert"><span class="badge">Verified by SkillUp NG</span><p class="muted">This certifies that</p><h1>${esc(c.full_name)}</h1><p class="muted">completed</p><h2>${esc(c.course_title)}</h2><p class="muted">Instructor: ${esc(c.instructor)}</p><p class="muted">Issued ${new Date(c.issued_at).toLocaleDateString('en-NG', { dateStyle: 'long' })} · ${esc(c.certificate_number)}</p></div>`}</div>`;
}
