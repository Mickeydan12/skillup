import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
export default async function (el, _p, ctx) {
  const { data: en, error } = await supabase.from('enrollments').select('id,course_id,courses(title)').eq('user_id', ctx.user.id);
  if (error) { el.innerHTML = '<div class="wrap"><div class="err">Could not load your courses.</div></div>'; return; }
  if (!en.length) { el.innerHTML = '<div class="wrap" style="padding-top:2rem"><div class="empty"><h2>Nothing here yet</h2><p>Enroll in a course and it will appear here.</p><a class="btn pri" href="/courses" data-link>Browse courses</a></div></div>'; return; }
  const ids = en.map(e => e.id), cids = en.map(e => e.course_id);
  const [prog, cur] = await Promise.all([supabase.from('lesson_progress').select('enrollment_id').in('enrollment_id', ids).eq('is_completed', true), supabase.from('course_curriculum').select('course_id,lesson_id').in('course_id', cids).not('lesson_id', 'is', null)]);
  const pct = e => { const t = (cur.data || []).filter(x => x.course_id === e.course_id).length, d = (prog.data || []).filter(x => x.enrollment_id === e.id).length; return t ? Math.round(d / t * 100) : 0; };
  el.innerHTML = `<div class="wrap" style="padding-top:2rem"><h1 style="margin-bottom:1rem">My learning</h1><div class="grid">${en.map(e => `<a class="card" href="/dashboard/my-learning/${e.id}" data-link><h3>${esc(e.courses?.title)}</h3><div class="bar"><i style="width:${pct(e)}%"></i></div><p class="muted">${pct(e)}% complete</p></a>`).join('')}</div></div>`;
}
