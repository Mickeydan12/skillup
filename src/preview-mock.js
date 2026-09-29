// DEMO ONLY (used for the hosted preview build). Returns canned sample data instead of calling Supabase.
const cat = (name, slug) => ({ name, slug });
const C = [['Web Development', 'web-development'], ['UI/UX Design', 'ui-ux-design'], ['Graphic Design', 'graphic-design'], ['Video Editing', 'video-editing'], ['Data Analysis', 'data-analysis'], ['Digital Marketing', 'digital-marketing'], ['Cybersecurity', 'cybersecurity'], ['Mobile Development', 'mobile-development']].map(x => cat(...x));
const P = { full_name: 'Sample Instructor' };
const CO = [['HTML & CSS Foundations', 'a', 'beginner', 0, true, 'web-development'], ['UI Design Basics', 'b', 'intermediate', 15000, false, 'ui-ux-design'], ['Intro to Data Analysis', 'c', 'beginner', 0, true, 'data-analysis'], ['Video Editing Essentials', 'd', 'beginner', 12000, false, 'video-editing']]
  .map(([title, slug, level, price, is_free, s]) => ({ title: '[SAMPLE] ' + title, slug, level, price, is_free, thumbnail_url: null, categories: { slug: s }, profiles: P }));
const J = [{ id: '1', title: '[SAMPLE] Landing page for a bakery', job_type: 'fixed_price', budget_min: 50000, budget_max: 120000 }, { id: '2', title: '[SAMPLE] Logo and brand kit', job_type: 'contract', budget_min: 30000, budget_max: 80000 }];
const real = window.fetch.bind(window);
window.fetch = (url, opts = {}) => {
  const u = String(url?.url || url); if (!u.includes('/rest/v1/')) return real(url, opts);
  const t = (u.match(/\/rest\/v1\/(\w+)/) || [])[1], data = t === 'categories' ? C : t === 'courses' ? CO : t === 'jobs' ? J : [];
  const q = new URL(u).searchParams.get('or') || '', term = (q.match(/ilike\.%([^%]*)%/) || [])[1]?.toLowerCase();
  const lvl = new URL(u).searchParams.get('level')?.replace('eq.', '');
  const rows = data.filter(r => (!term || r.title?.toLowerCase().includes(term)) && (!lvl || r.level === lvl));
  const h = { 'content-type': 'application/json', 'content-range': `0-0/${rows.length}` };
  return Promise.resolve(new Response(opts.method === 'HEAD' ? null : JSON.stringify(rows), { status: 200, headers: h }));
};
