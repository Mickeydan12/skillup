import { supabase } from '../config/supabase.js';
import { go } from '../router.js';
const field = (id, label, type = 'text', extra = '') => `<label>${label}<input id="${id}" name="${id}" type="${type}" required ${extra}/></label>`;
export function login(el) {
  el.innerHTML = `<form class="auth" id="f"><h1>Log in</h1>${field('email', 'Email', 'email')}${field('password', 'Password', 'password')}<p class="msg" id="m" role="alert"></p><button class="btn pri">Log in</button></form>`;
  el.querySelector('#f').onsubmit = async e => { e.preventDefault(); const m = el.querySelector('#m');
    const { error } = await supabase.auth.signInWithPassword({ email: el.querySelector('#email').value, password: el.querySelector('#password').value });
    if (error) { m.className = 'msg bad'; m.textContent = /confirm/i.test(error.message) ? 'Please verify your email first.' : 'Invalid email or password.'; return; }
    go(new URLSearchParams(location.search).get('next') || '/dashboard'); };
}
export function signup(el) {
  el.innerHTML = `<form class="auth" id="f"><h1>Create your account</h1>${field('full_name', 'Full name')}${field('username', 'Username', 'text', 'pattern="[a-z0-9_]{3,20}" title="3–20 lowercase letters, numbers or underscores"')}${field('email', 'Email', 'email')}${field('password', 'Password', 'password', 'minlength="8"')}
   <label>I want to join as<select id="role"><option value="student">Student / Freelancer</option><option value="employer">Employer</option></select></label>
   <label style="display:flex;gap:.5rem"><input id="terms" type="checkbox" required/> I accept the Terms and Privacy Policy</label><p class="msg" id="m" role="alert"></p><button class="btn pri">Sign up</button></form>`;
  const v = id => el.querySelector('#' + id).value;
  el.querySelector('#f').onsubmit = async e => { e.preventDefault(); const m = el.querySelector('#m');
    // The DB trigger only honours 'student' or 'employer'. Instructor/admin are granted server-side.
    const { error } = await supabase.auth.signUp({ email: v('email'), password: v('password'), options: { emailRedirectTo: location.origin + '/dashboard', data: { full_name: v('full_name'), username: v('username'), requested_role: v('role') } } });
    m.className = 'msg ' + (error ? 'bad' : 'good'); m.textContent = error ? error.message : 'Check your email to verify your account.'; };
}
