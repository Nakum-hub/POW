import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const rawAppEnvironment = import.meta.env.VITE_APP_ENV?.trim();

const hasConfiguredUrl = Boolean(rawSupabaseUrl && rawSupabaseUrl !== 'your_supabase_url');
const hasConfiguredAnonKey = Boolean(rawSupabaseAnonKey && rawSupabaseAnonKey !== 'your_supabase_anon_key');

export const appEnvironment = rawAppEnvironment || (import.meta.env.PROD ? 'production' : 'development');
export const isProductionEnvironment = import.meta.env.PROD || appEnvironment === 'production';

// Explicit opt-in for hosting a public, backend-free demo (e.g. GitHub Pages / Netlify).
// Unlike VITE_FORCE_DEMO_MODE (which is intentionally ignored in production builds so a
// misconfigured deploy can never silently serve seeded data to buyers), this flag is
// honored even in production. Whoever deploys the demo must set it deliberately.
export const publicDemoModeRequested = import.meta.env.VITE_PUBLIC_DEMO === 'true';
export const sandboxModeRequested =
  import.meta.env.VITE_FORCE_DEMO_MODE === 'true' || publicDemoModeRequested;
export const sandboxModeAllowed =
  publicDemoModeRequested ||
  (sandboxModeRequested && import.meta.env.VITE_ALLOW_SANDBOX_MODE === 'true' && !isProductionEnvironment);
export const sandboxModeBlocked = sandboxModeRequested && !sandboxModeAllowed;
export const forceDemoMode = sandboxModeAllowed;
export const hasSupabaseConfig = hasConfiguredUrl && hasConfiguredAnonKey;
export const supabaseUrl = hasConfiguredUrl ? rawSupabaseUrl! : 'https://demo.supabase.co';
export const supabaseAnonKey = hasConfiguredAnonKey ? rawSupabaseAnonKey! : 'demo-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
