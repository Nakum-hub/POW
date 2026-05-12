import { describe, expect, it } from 'vitest';
import {
  canCreateAnotherList,
  canExportCandidates,
  canSaveAnotherCandidate,
  getDefaultSubscription,
  getPlanDefinition,
  getSearchResultLimit,
} from './plans';

describe('plans', () => {
  it('returns sane defaults for starter subscriptions', () => {
    const subscription = getDefaultSubscription('user-1');

    expect(subscription.plan_key).toBe('starter');
    expect(getSearchResultLimit(subscription)).toBe(25);
    expect(canCreateAnotherList(subscription, 0)).toBe(true);
    expect(canCreateAnotherList(subscription, 1)).toBe(false);
    expect(canSaveAnotherCandidate(subscription, 9)).toBe(true);
    expect(canSaveAnotherCandidate(subscription, 10)).toBe(false);
    expect(canExportCandidates(subscription)).toBe(false);
  });

  it('unlocks scale entitlements correctly', () => {
    const definition = getPlanDefinition('scale');

    expect(definition.monthlyPrice).toBe(1490);
    expect(definition.entitlements.saved_lists_limit).toBe(40);
    expect(definition.entitlements.monthly_exports_limit).toBe(100);
    expect(definition.entitlements.includes_pipeline_analytics).toBe(true);
  });
});
