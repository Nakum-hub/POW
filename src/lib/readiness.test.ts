import { describe, expect, it } from 'vitest';
import { getReadinessChecks, getReadinessScore } from './readiness';

describe('readiness', () => {
  it('fails hard when demo mode blocks production', () => {
    const checks = getReadinessChecks({
      activeMode: 'demo',
      forceDemoMode: true,
      hasSupabaseConfig: false,
      planKey: 'starter',
      shortlistCount: 0,
      savedCandidateCount: 0,
    });

    expect(checks.find((check) => check.id === 'backend')?.status).toBe('fail');
    expect(getReadinessScore(checks)).toBeLessThan(50);
  });

  it('scores production setups higher when live backend and paid plan are active', () => {
    const checks = getReadinessChecks({
      activeMode: 'supabase',
      forceDemoMode: false,
      hasSupabaseConfig: true,
      planKey: 'growth',
      shortlistCount: 3,
      savedCandidateCount: 28,
    });

    expect(checks.every((check) => check.status !== 'fail')).toBe(true);
    expect(getReadinessScore(checks)).toBeGreaterThanOrEqual(75);
  });
});
