import { supabase } from '../config/supabase.js';
import { ngn, esc } from '../utils/format.js';
export default async function (el) {
  el.innerHTML = '<div class="wrap"><h1 style="margin:2rem 0 1rem">Find jobs</h1><div class="grid" id="list"><div class="skel"></div></div></div>';
  const { data, error } = await supabase.from('jobs').select('id,title,job_type,budget_min,budget_max').eq('status', 'published').order('created_at', { ascending: false }).limit(24);
  el.querySelector('#list').innerHTML = error ? '<div class="err">Could not load jobs.</div>' : data.length ? data.map(j => `<div class="card"><span class="badge">${esc(j.job_type)}</span><h3>${esc(j.title)}</h3><p class="muted">${ngn(j.budget_min)} – ${ngn(j.budget_max)}</p></div>`).join('') : '<div class="empty">No open jobs right now.</div>';
}
