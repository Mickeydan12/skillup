import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
export default async function (el, _p, ctx) {
  const uid = ctx.user.id;
  const n = async (t, col) => (await supabase.from(t).select('*', { count: 'exact', head: true }).eq(col, uid)).count ?? 0;
  const [enr, apps, saved, certs] = await Promise.all([n('enrollments', 'user_id'), n('job_applications', 'freelancer_id'), n('saved_jobs', 'user_id'), n('certificates', 'user_id')]);
  el.innerHTML = `<div class="wrap"><h1 style="margin:2rem 0">Welcome, ${esc((ctx.profile?.full_name || '').split(' ')[0])}</h1>
   <div class="grid">${[['Courses enrolled', enr], ['Applications', apps], ['Saved jobs', saved], ['Certificates', certs]].map(([l, v]) => `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`).join('')}</div>
   <p style="margin-top:1.5rem;display:flex;gap:.5rem;flex-wrap:wrap"><a class="btn pri" href="/dashboard/my-learning" data-link>My learning</a><a class="btn" href="/dashboard/instructor/courses" data-link>${ctx.roles.includes('instructor') ? 'My courses' : 'Become an instructor'}</a>${ctx.roles.includes('admin') ? '<a class="btn" href="/dashboard/admin" data-link>Admin moderation</a>' : ''}</p>
   ${enr ? '' : '<div class="empty" style="margin-top:1.5rem"><p>You have not enrolled in a course yet.</p><a class="btn pri" href="/courses" data-link>Browse courses</a></div>'}</div>`;
}
