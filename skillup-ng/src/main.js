import './styles/main.css';
import { supabase, configured } from './config/supabase.js';
import { route, render, setCtx, go } from './router.js';
import { esc } from './utils/format.js';

document.documentElement.dataset.theme = localStorage.getItem('theme') || 'dark'; // preference only

route('/', () => import('./pages/home.js'));
route('/courses', () => import('./pages/courses.js'));
route('/courses/:slug', () => import('./pages/course-details.js'));
route('/payment/callback', () => import('./pages/payment-callback.js'), { auth: true });
route('/jobs', () => import('./pages/jobs.js'));
route('/login', () => import('./pages/auth.js').then(m => ({ default: m.login })));
route('/signup', () => import('./pages/auth.js').then(m => ({ default: m.signup })));
route('/dashboard/instructor/courses', () => import('./pages/instructor-courses.js'), { auth: true });
route('/dashboard/instructor/courses/new', () => import('./pages/course-editor.js'), { auth: true, role: 'instructor' });
route('/dashboard/instructor/courses/:id/edit', () => import('./pages/course-editor.js'), { auth: true, role: 'instructor' });
route('/dashboard/admin', () => import('./pages/admin.js'), { auth: true, role: 'admin' });
route('/dashboard', () => import('./pages/dashboard.js'), { auth: true });

async function loadCtx() {
  const { data: { session } } = await supabase.auth.getSession(); const user = session?.user ?? null; let roles = [], profile = null;
  if (user) { // roles come from the DB (RLS-protected), never from user-editable metadata
    const [r, p] = await Promise.all([supabase.from('user_roles').select('role').eq('user_id', user.id), supabase.from('profiles').select('*').eq('id', user.id).single()]);
    roles = (r.data || []).map(x => x.role); profile = p.data; }
  setCtx({ user, roles, profile }); return { user, profile };
}
async function shell() {
  const { user, profile } = await loadCtx();
  document.getElementById('app').innerHTML = `
  <nav class="top"><div class="wrap"><a class="logo" href="/" data-link>SkillUp <b>NG</b></a>
    <div class="links"><a href="/" data-link>Home</a><a href="/courses" data-link>Explore Courses</a><a href="/jobs" data-link>Find Jobs</a></div>
    <button class="btn" id="theme" aria-label="Toggle theme">Theme</button>
    ${user ? `<a class="btn" href="/dashboard" data-link>${esc(profile?.full_name || 'Dashboard')}</a><button class="btn" id="out">Log out</button>`
           : `<a class="btn" href="/login" data-link>Log in</a><a class="btn pri" href="/signup" data-link>Get started</a>`}
  </div></nav>
  ${configured ? '' : '<div class="wrap"><div class="err" style="margin-top:1rem">Supabase is not configured. Copy .env.example to .env and add your project URL and anon key.</div></div>'}
  <main id="view"></main>
  <footer><div class="wrap">© ${new Date().getFullYear()} SkillUp NG. Learn Skills. Build Projects. Get Hired.</div></footer>`;
  document.getElementById('theme').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); };
  document.getElementById('out')?.addEventListener('click', async () => { await supabase.auth.signOut(); go('/'); });
  render();
}
shell();
supabase.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') shell(); });
