// Minimal History-API router. Supports :params, auth guards, and a 404 fallback.
const routes = [];
export const route = (path, load, opts = {}) => routes.push({ re: new RegExp('^' + path.replace(/:(\w+)/g,'(?<$1>[^/]+)') + '/?$'), load, opts });
const PREVIEW = import.meta.env.VITE_PREVIEW === '1';   // hosted demo has no server-side URL rewriting, so it uses #/paths
export const go = (to) => { if (PREVIEW) { location.hash = to; } else { history.pushState({}, '', to); render(); } };
let ctx = { user: null, roles: [] }; export const setCtx = c => (ctx = c);
export async function render() {
  const app = document.getElementById('view'); const path = (PREVIEW ? location.hash.slice(1) || '/' : location.pathname).split('?')[0];
  for (const r of routes) { const m = path.match(r.re); if (!m) continue;
    if (r.opts.auth && !ctx.user) return go('/login?next=' + encodeURIComponent(path));
    if (r.opts.role && !ctx.roles.includes(r.opts.role)) { app.innerHTML = '<div class="wrap"><div class="err">You do not have access to this page.</div></div>'; return; }
    app.innerHTML = '<div class="wrap"><div class="skel"></div></div>';
    try { const mod = await r.load(); await mod.default(app, m.groups || {}, ctx); } catch (e) { console.error(e); app.innerHTML = '<div class="wrap"><div class="err">Something went wrong loading this page. Please try again.</div></div>'; }
    return; }
  app.innerHTML = '<div class="wrap"><div class="empty"><h2>404</h2><p>That page does not exist.</p><a class="btn pri" href="/" data-link>Go home</a></div></div>';
}
document.addEventListener('click', e => { const a = e.target.closest('a[data-link]'); if (a) { e.preventDefault(); go(a.getAttribute('href')); } });
window.addEventListener('popstate', render); window.addEventListener('hashchange', render);
