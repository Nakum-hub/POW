import { describe, expect, it } from 'vitest';
import { resolveInitialBackendState } from './backend';

describe('resolveInitialBackendState', () => {
  it('uses live Supabase when configured and sandbox is not requested', () => {
    expect(
      resolveInitialBackendState({
        hasSupabaseConfig: true,
        sandboxModeAllowed: false,
        sandboxModeBlocked: false,
      })
    ).toEqual({ mode: 'supabase', message: null });
  });

  it('fails closed when production blocks a sandbox request', () => {
    expect(
      resolveInitialBackendState({
        hasSupabaseConfig: true,
        sandboxModeAllowed: false,
        sandboxModeBlocked: true,
      }).mode
    ).toBe('unavailable');
  });

  it('fails closed when Supabase is not configured', () => {
    expect(
      resolveInitialBackendState({
        hasSupabaseConfig: false,
        sandboxModeAllowed: false,
        sandboxModeBlocked: false,
      }).mode
    ).toBe('unavailable');
  });
});
