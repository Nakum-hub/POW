import type { PlanEntitlements, PlanKey, Subscription } from '../types';

export interface PlanDefinition {
  key: PlanKey;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyValueTarget: number;
  summary: string;
  buyer: string;
  accentClass: string;
  badgeClass: string;
  recommended?: boolean;
  features: string[];
  entitlements: PlanEntitlements;
}

export const planDefinitions: PlanDefinition[] = [
  {
    key: 'starter',
    name: 'Starter',
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyValueTarget: 0,
    summary: 'For founder-led hiring teams validating proof-of-work search.',
    buyer: 'Solo recruiter or founder',
    accentClass: 'text-gray-900',
    badgeClass: 'border-gray-200 bg-white text-gray-700',
    features: [
      '25 ranked search results per query',
      '1 shortlist with 10 saved candidates',
      'Public profile and repository review',
      'Email-only support',
    ],
    entitlements: {
      search_results_limit: 25,
      saved_lists_limit: 1,
      saved_candidates_limit: 10,
      monthly_exports_limit: 0,
      seats_included: 1,
      ai_briefs_limit: 5,
      supports_customer_portal: false,
      includes_pipeline_analytics: false,
      includes_white_glove_onboarding: false,
    },
  },
  {
    key: 'growth',
    name: 'Growth',
    monthlyPrice: 349,
    annualPrice: 3490,
    monthlyValueTarget: 12000,
    summary: 'For agency desks and recruiting teams running proof-of-work sourcing every week.',
    buyer: 'Hiring team or boutique agency',
    accentClass: 'text-blue-700',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    recommended: true,
    features: [
      '250 ranked search results per query',
      '10 shortlists with 150 saved candidates',
      'CSV exports and candidate handoff notes',
      '3 recruiter seats and candidate briefs',
    ],
    entitlements: {
      search_results_limit: 250,
      saved_lists_limit: 10,
      saved_candidates_limit: 150,
      monthly_exports_limit: 10,
      seats_included: 3,
      ai_briefs_limit: 75,
      supports_customer_portal: true,
      includes_pipeline_analytics: true,
      includes_white_glove_onboarding: false,
    },
  },
  {
    key: 'scale',
    name: 'Scale',
    monthlyPrice: 1490,
    annualPrice: 14900,
    monthlyValueTarget: 50000,
    summary: 'For internal recruiting orgs and talent platforms replacing resume-first screening.',
    buyer: 'Scaling in-house recruiting team',
    accentClass: 'text-emerald-700',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    features: [
      '1,000 ranked search results per query',
      '40 shortlists with 1,000 saved candidates',
      'Pipeline analytics and monthly exports',
      '15 seats with rollout support',
    ],
    entitlements: {
      search_results_limit: 1000,
      saved_lists_limit: 40,
      saved_candidates_limit: 1000,
      monthly_exports_limit: 100,
      seats_included: 15,
      ai_briefs_limit: 500,
      supports_customer_portal: true,
      includes_pipeline_analytics: true,
      includes_white_glove_onboarding: true,
    },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 0,
    annualPrice: 0,
    monthlyValueTarget: 125000,
    summary: 'For enterprise talent acquisition teams standardizing on verified proof-of-work hiring.',
    buyer: 'Enterprise TA and platform teams',
    accentClass: 'text-violet-700',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    features: [
      'Unlimited search, lists, and exports',
      'Hiring manager workspaces and enablement',
      'Custom onboarding and SLA-backed support',
      'Commercial and compliance review support',
    ],
    entitlements: {
      search_results_limit: Number.POSITIVE_INFINITY,
      saved_lists_limit: Number.POSITIVE_INFINITY,
      saved_candidates_limit: Number.POSITIVE_INFINITY,
      monthly_exports_limit: Number.POSITIVE_INFINITY,
      seats_included: 50,
      ai_briefs_limit: Number.POSITIVE_INFINITY,
      supports_customer_portal: true,
      includes_pipeline_analytics: true,
      includes_white_glove_onboarding: true,
    },
  },
];

const defaultPlanKey: PlanKey = 'starter';

export function getPlanDefinition(planKey: PlanKey) {
  return planDefinitions.find((plan) => plan.key === planKey) || planDefinitions[0];
}

export function getDefaultSubscription(userId = 'anonymous'): Subscription {
  const starter = getPlanDefinition(defaultPlanKey);

  return {
    id: `${userId}-starter-subscription`,
    user_id: userId,
    plan_key: starter.key,
    status: 'trialing',
    seats: starter.entitlements.seats_included,
    monthly_price: starter.monthlyPrice,
    monthly_value_target: starter.monthlyValueTarget,
    current_period_end: null,
    notes: 'Starter access is active until billing is configured.',
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

export function normalizeSubscription(subscription: Subscription | null | undefined, userId?: string) {
  if (!subscription) {
    return getDefaultSubscription(userId);
  }

  const definition = getPlanDefinition(subscription.plan_key);

  return {
    ...subscription,
    seats: subscription.seats || definition.entitlements.seats_included,
    monthly_price: subscription.monthly_price || definition.monthlyPrice,
    monthly_value_target: subscription.monthly_value_target || definition.monthlyValueTarget,
    notes: subscription.notes || definition.summary,
  };
}

export function getPlanEntitlements(subscription: Subscription | null | undefined) {
  return getPlanDefinition((subscription?.plan_key || defaultPlanKey) as PlanKey).entitlements;
}

export function canCreateAnotherList(subscription: Subscription | null | undefined, currentListCount: number) {
  const { saved_lists_limit: limit } = getPlanEntitlements(subscription);
  return !Number.isFinite(limit) || currentListCount < limit;
}

export function canSaveAnotherCandidate(subscription: Subscription | null | undefined, currentSavedCount: number) {
  const { saved_candidates_limit: limit } = getPlanEntitlements(subscription);
  return !Number.isFinite(limit) || currentSavedCount < limit;
}

export function canExportCandidates(subscription: Subscription | null | undefined) {
  const { monthly_exports_limit: limit } = getPlanEntitlements(subscription);
  return !Number.isFinite(limit) || limit > 0;
}

export function getSearchResultLimit(subscription: Subscription | null | undefined) {
  return getPlanEntitlements(subscription).search_results_limit;
}

export function formatPlanPrice(plan: PlanDefinition) {
  if (plan.key === 'starter') {
    return 'Free';
  }

  if (plan.key === 'enterprise' || plan.monthlyPrice === 0) {
    return 'Custom';
  }

  return `$${plan.monthlyPrice.toLocaleString()}/mo`;
}

export function getUpgradeTarget(planKey: PlanKey): PlanKey {
  switch (planKey) {
    case 'starter':
      return 'growth';
    case 'growth':
      return 'scale';
    case 'scale':
      return 'enterprise';
    case 'enterprise':
    default:
      return 'enterprise';
  }
}
