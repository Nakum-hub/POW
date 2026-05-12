import {
  hasSupabaseConfig,
  sandboxModeAllowed,
  sandboxModeBlocked,
  supabaseAnonKey,
  supabaseUrl,
} from './supabase';

export type BackendMode = 'supabase' | 'demo' | 'unavailable';

export interface BackendStateInput {
  hasSupabaseConfig: boolean;
  sandboxModeAllowed: boolean;
  sandboxModeBlocked: boolean;
}

export interface BackendState {
  mode: BackendMode;
  message: string | null;
}

export function resolveInitialBackendState(input: BackendStateInput): BackendState {
  if (input.sandboxModeAllowed) {
    return {
      mode: 'demo',
      message: 'Sandbox workspace is active for local evaluation.',
    };
  }

  if (input.sandboxModeBlocked) {
    return {
      mode: 'unavailable',
      message: 'Sandbox mode was requested but is not allowed in this environment.',
    };
  }

  if (!input.hasSupabaseConfig) {
    return {
      mode: 'unavailable',
      message: 'Supabase is not configured. Customer-facing operation is disabled.',
    };
  }

  return { mode: 'supabase', message: null };
}

const initialState = resolveInitialBackendState({
  hasSupabaseConfig,
  sandboxModeAllowed,
  sandboxModeBlocked,
});

let backendMode: BackendMode = initialState.mode;
let backendMessage = initialState.message;
let detectionPromise: Promise<BackendMode> | null = null;

export function getBackendMode() {
  return backendMode;
}

export function getBackendMessage() {
  return backendMessage;
}

export function setBackendMode(mode: BackendMode, message: string | null = null) {
  backendMode = mode;
  backendMessage = message;
}

export async function detectBackendMode(): Promise<BackendMode> {
  if (detectionPromise) {
    return detectionPromise;
  }

  const staticState = resolveInitialBackendState({
    hasSupabaseConfig,
    sandboxModeAllowed,
    sandboxModeBlocked,
  });

  if (staticState.mode !== 'supabase') {
    setBackendMode(staticState.mode, staticState.message);
    return staticState.mode;
  }

  detectionPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);

    try {
      await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        signal: controller.signal,
      });

      setBackendMode('supabase', null);
      return 'supabase';
    } catch {
      setBackendMode('unavailable', 'Supabase is unreachable. Customer-facing operation is disabled.');
      return 'unavailable';
    } finally {
      window.clearTimeout(timeoutId);
    }
  })();

  return detectionPromise;
}
