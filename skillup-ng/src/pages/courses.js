import { supabase } from '../config/supabase.js';
import { ngn, esc, debounce } from '../utils/format.js';
export default async function (el) {
  el.innerHTML = `<div class="wrap"><h1 style="margin:2rem 0 1rem">Explore courses</h1>
   <div style="display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:1rem"><input id="q" type="search" placeholder="Search courses" aria-label="Search courses"/>
   <select id="lvl" aria-label="Level"><option value="">All levels</option><option>beginner</option><option>intermediate</option><option>advanced</option></select>
   <select id="sort" aria-label="Sort"><option value="published_at">Newest</option><option value="price">Price</option></select></div>
   <div class="grid" id="list"></div></div>`;
  const list = el.querySelector('#list');
  async function load() { // server-side filtering with a capped page size
    list.innerHTML = '<div class="skel"></div>';
    let q = supabase.from('courses').select('title,slug,level,price,is_free,profiles(full_name)').eq('status', 'published').limit(24);
    const t = el.querySelector('#q').value.trim().replace(/[%,()]/g, ''); if (t) q = q.or(`title.ilike.%${t}%,short_description.ilike.%${t}%`);
    const l = el.querySelector('#lvl').value; if (l) q = q.eq('level', l);
    const s = el.querySelector('#sort').value; q = q.order(s, { ascending: s === 'price' });
    const { data, error } = await q;
    if (error) return list.innerHTML = '<div class="err">Could not load courses.</div>';
    list.innerHTML = data.length ? data.map(c => `<a class="card" href="/courses/${esc(c.slug)}" data-link><span class="badge">${esc(c.level)}</span><h3>${esc(c.title)}</h3><p class="muted">${esc(c.profiles?.full_name)}</p><strong>${c.is_free ? 'Free' : ngn(c.price)}</strong></a>`).join('') : '<div class="empty">No courses match your filters.</div>';
  }
  el.querySelector('#q').addEventListener('input', debounce(load)); el.querySelector('#lvl').onchange = el.querySelector('#sort').onchange = load; load();
}
