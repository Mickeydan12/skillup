import { supabase } from '../config/supabase.js';
import { ngn, esc } from '../utils/format.js';
const count = async (t, f) => { let q = supabase.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const { count: c } = await q; return c ?? 0; };
export default async function (el) {
  el.innerHTML = `<div class="wrap"><section class="hero"><div>
    <h1>Learn Digital Skills. Build Your Future.</h1>
    <p>Master in-demand skills, build a portfolio that stands out, and connect with opportunities that move your career forward.</p>
    <div class="cta"><a class="btn pri" href="/courses" data-link>Explore Courses</a><a class="btn" href="/jobs" data-link>Find Freelance Jobs</a></div></div>
    <div class="stats" id="stats"></div></section>
    <section class="blk"><h2>Popular categories</h2><div class="grid" id="cats"><div class="skel"></div></div></section>
    <section class="blk"><h2>Featured courses</h2><div class="grid" id="courses"><div class="skel"></div></div><p style="margin-top:1rem"><a class="btn" href="/courses" data-link>See all courses</a></p></section>
    <section class="blk"><h2>Recent jobs</h2><div class="grid" id="jobs"><div class="skel"></div></div></section></div>`;
  const [nc, nl, nj, cats, courses, jobs] = await Promise.all([
    count('courses', q => q.eq('status', 'published')), count('profiles'), count('jobs', q => q.eq('status', 'published')),
    supabase.from('categories').select('name,slug').eq('is_active', true).limit(8),
    supabase.from('courses').select('title,slug,level,price,is_free,profiles(full_name)').eq('status', 'published').order('published_at', { ascending: false }).limit(6),
    supabase.from('jobs').select('id,title,budget_min,budget_max,job_type').eq('status', 'published').order('created_at', { ascending: false }).limit(6)]);
  // Real counts only; an empty database honestly shows zeros.
  el.querySelector('#stats').innerHTML = [['Published courses', nc], ['Registered learners', nl], ['Jobs posted', nj]].map(([l, v]) => `<div class="stat"><strong>${v}</strong><span>${l}</span></div>`).join('');
  const fill = (id, rows, tpl, empty) => el.querySelector(id).innerHTML = rows?.length ? rows.map(tpl).join('') : `<div class="empty">${empty}</div>`;
  fill('#cats', cats.data, c => `<a class="card" href="/courses?category=${esc(c.slug)}" data-link><h3>${esc(c.name)}</h3></a>`, 'No categories yet. Run the migration to add the defaults.');
  fill('#courses', courses.data, c => `<a class="card" href="/courses/${esc(c.slug)}" data-link><span class="badge">${esc(c.level)}</span><h3>${esc(c.title)}</h3><p class="muted">${esc(c.profiles?.full_name)}</p><strong>${c.is_free ? 'Free' : ngn(c.price)}</strong></a>`, 'No published courses yet.');
  fill('#jobs', jobs.data, j => `<div class="card"><span class="badge">${esc(j.job_type)}</span><h3>${esc(j.title)}</h3><p class="muted">${ngn(j.budget_min)} – ${ngn(j.budget_max)}</p></div>`, 'No open jobs yet.');
}
