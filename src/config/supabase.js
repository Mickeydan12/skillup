import { createClient } from '@supabase/supabase-js';
export const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
// Only the public URL + anon key are used in the browser. Access is enforced by RLS.
// When unconfigured, requests fail instantly so pages show an error instead of loading forever.
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://localhost', import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing',
  configured ? {} : { global: { fetch: () => Promise.reject(new TypeError('Supabase is not configured')) } });
