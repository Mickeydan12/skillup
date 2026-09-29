import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
const embed = u => { try { const x = new URL(u); if (x.protocol !== 'https:') return ''; const yt = x.hostname.includes('youtu.be') ? x.pathname.slice(1) : x.hostname.includes('youtube.com') ? x.searchParams.get('v') : null;
  return yt ? `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}" allowfullscreen title="Lesson video"></iframe>` : `<video controls src="${esc(x.href)}"></video>`; } catch { return ''; } };
export default async function (el, { enrollmentId }, ctx) {
  const { data: en } = await supabase.from('enrollments').select('id,course_id,courses(title)').eq('id', enrollmentId).eq('user_id', ctx.user.id).maybeSingle();
  if (!en) { el.innerHTML = '<div class="wrap"><div class="err">You do not have access to this course.</div></div>'; return; }
  // RLS returns lessons only because this user is enrolled; nobody else can read them.
  const { data: secs } = await supabase.from('course_sections').select('id,title,position,lessons(id,title,lesson_type,video_url,content,position)').eq('course_id', en.course_id).order('position');
  const lessons = (secs || []).flatMap(s => (s.lessons || []).sort((a, b) => a.position - b.position));
  if (!lessons.length) { el.innerHTML = '<div class="wrap"><div class="empty">This course has no lessons yet.</div></div>'; return; }
  let done = new Set(((await supabase.from('lesson_progress').select('lesson_id').eq('enrollment_id', en.id).eq('is_completed', true)).data || []).map(x => x.lesson_id));
  let cur = lessons.find(l => l.id === new URLSearchParams(location.search).get('lesson')) || lessons.find(l => !done.has(l.id)) || lessons[0];   // resume where the student left off
  function draw(msg = '') {
    const i = lessons.indexOf(cur), pct = Math.round(done.size / lessons.length * 100);
    el.innerHTML = `<div class="wrap player"><div><h1>${esc(cur.title)}</h1><div class="media">${cur.lesson_type === 'video' && cur.video_url ? embed(cur.video_url) : ''}</div>
      ${cur.lesson_type === 'text' ? `<p style="white-space:pre-wrap;margin:1rem 0">${esc(cur.content)}</p>` : ''}${cur.lesson_type === 'pdf' && cur.video_url ? `<p><a class="btn" href="${esc(cur.video_url)}" target="_blank" rel="noopener noreferrer">Open PDF</a></p>` : ''}
      <p class="msg ${msg.startsWith('!') ? 'bad' : 'good'}" role="status">${esc(msg.replace(/^!/, ''))}</p>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn" id="prev" ${i ? '' : 'disabled'}>Previous</button><button class="btn pri" id="done">${done.has(cur.id) ? 'Completed' : 'Mark as complete'}</button><button class="btn" id="next" ${i < lessons.length - 1 ? '' : 'disabled'}>Next</button>
      ${pct === 100 ? '<button class="btn pri" id="cert">Get certificate</button>' : ''}</div></div>
      <aside class="card"><strong>${esc(en.courses?.title)}</strong><div class="bar"><i style="width:${pct}%"></i></div><p class="muted">${pct}% complete</p>
      ${lessons.map(l => `<button class="les ${l === cur ? 'on' : ''}" data-id="${l.id}">${done.has(l.id) ? '✓ ' : ''}${esc(l.title)}</button>`).join('')}</aside></div>`;
    el.querySelectorAll('.les').forEach(b => b.onclick = () => { cur = lessons.find(l => l.id === b.dataset.id); draw(); });
    el.querySelector('#prev').onclick = () => { cur = lessons[i - 1]; draw(); }; el.querySelector('#next').onclick = () => { cur = lessons[i + 1]; draw(); };
    el.querySelector('#done').onclick = async () => { if (done.has(cur.id)) return;
      const { error } = await supabase.from('lesson_progress').upsert({ enrollment_id: en.id, lesson_id: cur.id, is_completed: true, completed_at: new Date().toISOString() }, { onConflict: 'enrollment_id,lesson_id' });
      if (error) return draw('!Could not save your progress. Try again.'); done.add(cur.id); draw('Lesson completed.'); };
    el.querySelector('#cert')?.addEventListener('click', async () => { const { data, error } = await supabase.rpc('issue_certificate', { p_enrollment: en.id });
      if (error) return draw('!' + error.message); el.querySelector('.msg').innerHTML = `Certificate issued. <a href="/certificates/${esc(data)}" data-link><u>View certificate ${esc(data)}</u></a>`; });
  }
  draw();
}
