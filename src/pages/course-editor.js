import { supabase } from '../config/supabase.js';
import { esc } from '../utils/format.js';
import { go } from '../router.js';
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + Math.random().toString(36).slice(2, 6);
export default async function (el, { id }, ctx) {
  let c = { title: '', short_description: '', description: '', level: 'beginner', is_free: true, price: 0, category_id: '', status: 'draft' };
  if (id) { const { data } = await supabase.from('courses').select('*').eq('id', id).eq('instructor_id', ctx.user.id).maybeSingle();   // RLS also enforces ownership
    if (!data) { el.innerHTML = '<div class="wrap"><div class="err">Course not found.</div></div>'; return; } c = data; }
  const { data: cats } = await supabase.from('categories').select('id,name').eq('is_active', true);
  const locked = c.status === 'published' || c.status === 'pending_review';
  el.innerHTML = `<div class="wrap" style="padding-top:2rem"><h1>${id ? 'Edit course' : 'New course'}</h1><p class="badge">${esc(c.status)}</p>
   ${c.rejection_reason ? `<div class="err" style="margin:1rem 0">Rejected: ${esc(c.rejection_reason)}</div>` : ''}
   <form class="auth" style="margin:1rem 0;max-width:640px" id="f"><fieldset ${locked ? 'disabled' : ''} style="border:0;display:grid;gap:.9rem">
    <label>Title<input id="title" required maxlength="120" value="${esc(c.title)}"/></label>
    <label>Short description<input id="short" maxlength="200" value="${esc(c.short_description)}"/></label>
    <label>Full description<textarea id="desc" rows="5">${esc(c.description)}</textarea></label>
    <label>Category<select id="cat"><option value="">Choose</option>${(cats || []).map(k => `<option value="${k.id}" ${k.id === c.category_id ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select></label>
    <label>Level<select id="lvl">${['beginner', 'intermediate', 'advanced'].map(l => `<option ${l === c.level ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label style="display:flex;gap:.5rem"><input type="checkbox" id="free" ${c.is_free ? 'checked' : ''}/> Free course</label>
    <label>Price (NGN)<input id="price" type="number" min="0" step="100" value="${c.price || 0}"/></label>
    <button class="btn pri">Save draft</button></fieldset><p class="msg" id="m" role="status"></p></form>
   <div id="cur"></div></div>`;
  const $ = s => el.querySelector(s), say = (t, bad) => { $('#m').className = 'msg ' + (bad ? 'bad' : 'good'); $('#m').textContent = t; };
  $('#f').onsubmit = async e => { e.preventDefault(); const free = $('#free').checked;
    const row = { title: $('#title').value.trim(), short_description: $('#short').value, description: $('#desc').value, category_id: $('#cat').value || null, level: $('#lvl').value, is_free: free, price: free ? 0 : Number($('#price').value) };
    if (!free && !(row.price > 0)) return say('Enter a price above zero, or mark the course free.', true);
    const q = id ? supabase.from('courses').update({ ...row, status: 'draft' }).eq('id', id) : supabase.from('courses').insert({ ...row, slug: slugify(row.title), instructor_id: ctx.user.id, status: 'draft' }).select('id').single();
    const { data, error } = await q; if (error) return say('Could not save. Check your details and try again.', true);
    if (!id) go(`/dashboard/instructor/courses/${data.id}/edit`); else say('Saved.'); };
  if (!id) { $('#cur').innerHTML = '<p class="muted">Save the course to start adding sections and lessons.</p>'; return; }

  async function curriculum() {
    const { data: secs } = await supabase.from('course_sections').select('id,title,position,lessons(id,title,lesson_type,duration_seconds,is_preview,position)').eq('course_id', id).order('position');
    const n = (secs || []).reduce((a, s) => a + (s.lessons?.length || 0), 0);
    $('#cur').innerHTML = `<h2 style="margin:1.5rem 0 .75rem">Curriculum</h2>${(secs || []).map(s => `<div class="card" style="margin-bottom:.75rem"><h3>${esc(s.title)}</h3>
      ${(s.lessons || []).sort((a, b) => a.position - b.position).map(l => `<p class="muted">${esc(l.title)} · ${l.lesson_type}${l.is_preview ? ' · preview' : ''}</p>`).join('')}
      ${locked ? '' : `<form data-sec="${s.id}" style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem"><input name="t" placeholder="Lesson title" required/><select name="ty"><option>video</option><option>text</option><option>pdf</option></select><input name="u" type="url" placeholder="Video or file URL"/><input name="d" type="number" min="0" placeholder="Minutes" style="width:90px"/><label style="display:flex;gap:.3rem;align-items:center"><input type="checkbox" name="p"/>Preview</label><button class="btn">Add lesson</button></form>`}</div>`).join('')}
     ${locked ? '' : '<form id="ns" style="display:flex;gap:.5rem;margin:.75rem 0"><input id="st" placeholder="New section title" required/><button class="btn">Add section</button></form>'}
     ${locked ? '' : `<button class="btn pri" id="sub" ${n ? '' : 'disabled'}>Submit for review</button>`}`;
    $('#ns')?.addEventListener('submit', async e => { e.preventDefault(); const { error } = await supabase.from('course_sections').insert({ course_id: id, title: $('#st').value.trim(), position: (secs || []).length }); error ? say('Could not add section.', true) : curriculum(); });
    el.querySelectorAll('form[data-sec]').forEach(f => f.onsubmit = async e => { e.preventDefault(); const d = new FormData(f), sec = secs.find(s => s.id === f.dataset.sec);
      const { error } = await supabase.from('lessons').insert({ section_id: sec.id, title: d.get('t').trim(), lesson_type: d.get('ty'), video_url: d.get('u') || null, duration_seconds: (Number(d.get('d')) || 0) * 60, is_preview: !!d.get('p'), position: sec.lessons?.length || 0 });
      error ? say('Could not add lesson.', true) : curriculum(); });
    $('#sub')?.addEventListener('click', async () => { const { error } = await supabase.from('courses').update({ status: 'pending_review' }).eq('id', id); error ? say(error.message.includes('lesson') ? 'Add at least one lesson first.' : 'Could not submit.', true) : go('/dashboard/instructor/courses'); });
  }
  curriculum();
}
