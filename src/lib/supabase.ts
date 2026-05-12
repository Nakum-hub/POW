import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const rawAppEnvironment = import.meta.env.VITE_APP_ENV?.trim();

const hasConfiguredUrl = Boolean(rawSupabaseUrl && rawSupabaseUrl !== 'your_supabase_url');
const hasConfiguredAnonKey = Boolean(rawSupabaseAnonKey && rawSupabaseAnonKey !== 'your_supabase_anon_key');

export const appEnvironment = rawAppEnvironment || (import.meta.env.PROD ? 'production' : 'development');
export const isProductionEnvironment = import.meta.env.PROD || appEnvironment === 'production';
export const sandboxModeRequested = import.meta.env.VITE_FORCE_DEMO_MODE === 'true';
export const sandboxModeAllowed =
  sandboxModeRequested && import.meta.env.VITE_ALLOW_SANDBOX_MODE === 'true' && !isProductionEnvironment;
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
