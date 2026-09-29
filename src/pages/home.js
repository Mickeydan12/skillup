import { supabase } from '../config/supabase.js';
import { ngn, esc } from '../utils/format.js';
import { courseCard } from '../utils/cards.js';
import { icon, catIcon } from '../utils/icons.js';
const count = async (t, f) => { try { let q = supabase.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const { count: c, error } = await q; return error ? null : c; } catch { return null; } };
const safe = async p => { try { return await p; } catch (e) { return { data: null, error: e }; } };
export default async function (el) {
  el.innerHTML = `<div class="wrap"><section class="hero"><div>
    <h1>Learn Digital Skills. Build Your Future.</h1>
    <p>Master in-demand skills, build a portfolio that stands out, and connect with opportunities that move your career forward.</p>
    <div class="cta"><a class="btn pri" href="/courses" data-link>Explore Courses</a><a class="btn" href="/jobs" data-link>Find Freelance Jobs</a></div></div>
    <div><svg class="art" viewBox="0 0 420 300" role="img" aria-label="A course lesson with a progress bar and a completion badge"><rect x="10" y="10" width="330" height="220" rx="16" fill="var(--card)" stroke="var(--bd)"/><circle cx="34" cy="34" r="5" fill="#EF4444"/><circle cx="52" cy="34" r="5" fill="#FBBF24"/><circle cx="70" cy="34" r="5" fill="#22C55E"/><rect x="30" y="62" width="150" height="10" rx="5" fill="#8B5CF6"/><rect x="52" y="86" width="210" height="8" rx="4" fill="var(--bd)"/><rect x="52" y="106" width="130" height="8" rx="4" fill="#38BDF8"/><rect x="52" y="126" width="240" height="8" rx="4" fill="var(--bd)"/><rect x="30" y="150" width="170" height="8" rx="4" fill="#A78BFA"/><rect x="30" y="196" width="290" height="8" rx="4" fill="var(--elev)"/><rect x="30" y="196" width="190" height="8" rx="4" fill="#8B5CF6"/><g transform="translate(300 190)"><circle r="52" fill="var(--elev)" stroke="#8B5CF6" stroke-width="3"/><path d="M-20 0l14 14 26-28" fill="none" stroke="#22C55E" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></g><rect x="290" y="30" width="110" height="64" rx="12" fill="var(--card)" stroke="var(--bd)"/><rect x="304" y="46" width="60" height="8" rx="4" fill="#38BDF8"/><rect x="304" y="64" width="80" height="8" rx="4" fill="var(--bd)"/></svg></div></section><div class="stats row" id="stats"></div>
    <section class="trust">${[['book', 'Learn at your own pace'], ['code', 'Build real-world projects'], ['award', 'Showcase your skills'], ['briefcase', 'Connect with employers']].map(([i, t]) => `<div>${icon(i)}<span>${t}</span></div>`).join('')}</section>
    <section class="blk"><h2>Popular categories</h2><div class="grid" id="cats"><div class="skel"></div></div></section>
    <section class="blk"><h2>Featured courses</h2><div class="grid" id="courses"><div class="skel"></div></div><p style="margin-top:1rem"><a class="btn" href="/courses" data-link>See all courses</a></p></section>
    <section class="blk"><h2>How it works</h2><div class="grid">${[['Learn', 'Choose a skill and study at your own pace.'], ['Build', 'Complete practical projects and publish your portfolio.'], ['Earn', 'Apply for jobs and connect with clients.']].map(([t, d], i) => `<div class="card"><h3>Step ${i + 1}: ${t}</h3><p class="muted">${d}</p></div>`).join('')}</div></section>
    <section class="blk"><h2>Recent jobs</h2><div class="grid" id="jobs"><div class="skel"></div></div></section>
    <section class="band"><div>${icon('users', 28)}<h2>Teach what you know</h2><p>Share your expertise with learners across Nigeria and earn from your courses.</p></div><a class="btn pri" href="/dashboard/instructor/courses" data-link>Become an Instructor</a></section>
    <section class="final"><h2>Your Next Opportunity Starts Here.</h2><div class="cta"><a class="btn pri" href="/signup" data-link>Create Free Account</a><a class="btn" href="/courses" data-link>Explore Learning Paths</a></div></section></div>`;
  const [nc, nl, nj, cats, courses, jobs] = await Promise.all([
    count('courses', q => q.eq('status', 'published')), count('profiles'), count('jobs', q => q.eq('status', 'published')),
    safe(supabase.from('categories').select('name,slug').eq('is_active', true).limit(8)),
    safe(supabase.from('courses').select('title,slug,level,price,is_free,thumbnail_url,categories(slug),profiles(full_name)').eq('status', 'published').order('published_at', { ascending: false }).limit(6)),
    safe(supabase.from('jobs').select('id,title,budget_min,budget_max,job_type').eq('status', 'published').order('created_at', { ascending: false }).limit(6))]);
  // Real counts only. A failed query shows a dash, an empty database shows zero.
  el.querySelector('#stats').innerHTML = [['Published courses', nc], ['Registered learners', nl], ['Jobs posted', nj]].map(([l, v]) => `<div class="stat"><strong>${v ?? '–'}</strong><span>${l}</span></div>`).join('');
  const fill = (id, res, tpl, empty) => el.querySelector(id).innerHTML = res.error ? '<div class="err" style="grid-column:1/-1">Could not load this section. Check your connection and try again.</div>' : res.data?.length ? res.data.map(tpl).join('') : `<div class="empty" style="grid-column:1/-1">${empty}</div>`;
  fill('#cats', cats, c => `<a class="card cat" href="/courses?category=${esc(c.slug)}" data-link>${catIcon(c.slug)}<h3>${esc(c.name)}</h3></a>`, 'No categories yet.');
  fill('#courses', courses, courseCard, 'No published courses yet. Instructors can publish the first one.');
  fill('#jobs', jobs, j => `<div class="card"><span class="badge">${esc(j.job_type)}</span><h3>${esc(j.title)}</h3><p class="muted">${ngn(j.budget_min)} – ${ngn(j.budget_max)}</p></div>`, 'No open jobs yet. Employers can post the first one.');
}
