import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
export default async function (el) {
  el.innerHTML = '<div class="wrap" style="padding-top:2rem"><h1>Moderation</h1><h2 style="margin:1.5rem 0 .75rem">Courses pending review</h2><div class="grid" id="c"></div><h2 style="margin:1.5rem 0 .75rem">Role requests</h2><div class="grid" id="r"></div><p class="msg" id="m" role="status"></p></div>';
  async function load() {
    const [c, r] = await Promise.all([
      supabase.from('courses').select('id,title,short_description,profiles(full_name),course_sections(lessons(id))').eq('status', 'pending_review'),
      supabase.from('role_requests').select('id,requested_role,profiles(full_name,username)').eq('status', 'pending')]);
    el.querySelector('#c').innerHTML = c.data?.length ? c.data.map(x => `<div class="card"><h3>${esc(x.title)}</h3><p class="muted">${esc(x.profiles?.full_name)} · ${x.course_sections.reduce((a, s) => a + s.lessons.length, 0)} lessons</p><div style="display:flex;gap:.5rem;margin-top:.5rem"><button class="btn pri" data-a="ok" data-id="${x.id}">Approve</button><button class="btn" data-a="no" data-id="${x.id}">Reject</button></div></div>`).join('') : '<div class="empty">Nothing waiting for review.</div>';
    el.querySelector('#r').innerHTML = r.data?.length ? r.data.map(x => `<div class="card"><h3>${esc(x.profiles?.full_name)}</h3><p class="muted">wants ${esc(x.requested_role)} access</p><div style="display:flex;gap:.5rem;margin-top:.5rem"><button class="btn pri" data-a="rok" data-id="${x.id}">Approve</button><button class="btn" data-a="rno" data-id="${x.id}">Decline</button></div></div>`).join('') : '<div class="empty">No pending requests.</div>';
  }
  el.onclick = async e => { const b = e.target.closest('button[data-a]'); if (!b) return; const { a, id } = b.dataset; let res;
    if (a === 'ok') res = await supabase.rpc('admin_review_course', { p_course: id, p_approve: true });
    if (a === 'no') { const reason = prompt('Reason for rejection (shown to the instructor):'); if (!reason) return; res = await supabase.rpc('admin_review_course', { p_course: id, p_approve: false, p_reason: reason }); }
    if (a === 'rok' || a === 'rno') res = await supabase.rpc('admin_review_role_request', { p_request: id, p_approve: a === 'rok' });
    const m = el.querySelector('#m'); m.className = 'msg ' + (res.error ? 'bad' : 'good'); m.textContent = res.error ? res.error.message : 'Done.'; load(); };
  load();
}
