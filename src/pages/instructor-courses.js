import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
const LABEL = { draft: 'Draft', pending_review: 'Pending review', published: 'Published', rejected: 'Rejected', archived: 'Archived' };
export default async function (el, _p, ctx) {
  if (!ctx.roles.includes('instructor')) {
    const { data } = await supabase.from('role_requests').select('status').eq('user_id', ctx.user.id).eq('requested_role', 'instructor').order('created_at', { ascending: false }).limit(1);
    const pending = data?.[0]?.status === 'pending';
    el.innerHTML = `<div class="wrap" style="padding-top:2rem"><div class="empty"><h2>Teach on SkillUp NG</h2><p>Instructor access is approved by our team.</p><p class="msg" id="m" role="status"></p>
      <button class="btn pri" id="req" ${pending ? 'disabled' : ''}>${pending ? 'Request pending' : 'Request instructor access'}</button></div></div>`;
    el.querySelector('#req').onclick = async e => { const { error } = await supabase.from('role_requests').insert({ user_id: ctx.user.id, requested_role: 'instructor' });
      const m = el.querySelector('#m'); m.className = 'msg ' + (error ? 'bad' : 'good'); m.textContent = error ? 'Could not send your request.' : 'Request sent. We will notify you.'; if (!error) e.target.disabled = true; };
    return;
  }
  const { data, error } = await supabase.from('courses').select('id,title,status,rejection_reason').eq('instructor_id', ctx.user.id).order('created_at', { ascending: false });
  el.innerHTML = `<div class="wrap" style="padding-top:2rem"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem"><h1>My courses</h1><a class="btn pri" href="/dashboard/instructor/courses/new" data-link>Create course</a></div>
   <div class="grid">${error ? '<div class="err">Could not load courses.</div>' : data.length ? data.map(c => `<a class="card" href="/dashboard/instructor/courses/${c.id}/edit" data-link><span class="badge">${LABEL[c.status]}</span><h3>${esc(c.title)}</h3>${c.rejection_reason ? `<p class="muted">Feedback: ${esc(c.rejection_reason)}</p>` : ''}</a>`).join('') : '<div class="empty">You have not created a course yet.</div>'}</div></div>`;
}
