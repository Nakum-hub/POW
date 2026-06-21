import type { BackendMode } from './backend';
import type { PlanKey } from '../types';

export interface ReadinessCheck {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}

export interface ReadinessInput {
  activeMode: BackendMode;
  forceDemoMode: boolean;
  hasSupabaseConfig: boolean;
  planKey: PlanKey;
  shortlistCount: number;
  savedCandidateCount: number;
}

export function getReadinessChecks(input: ReadinessInput): ReadinessCheck[] {
  const checks: ReadinessCheck[] = [];

  checks.push({
    id: 'backend',
    label: 'Live backend',
    status: input.activeMode === 'supabase' && input.hasSupabaseConfig && !input.forceDemoMode ? 'pass' : 'fail',
    detail:
      input.activeMode === 'supabase' && input.hasSupabaseConfig && !input.forceDemoMode
        ? 'Production data path is active.'
        : 'Sandbox mode or missing Supabase config is blocking customer-facing operation.',
  });

  checks.push({
    id: 'pricing',
    label: 'Commercial plan',
    status: input.planKey === 'starter' ? 'warn' : 'pass',
    detail:
      input.planKey === 'starter'
        ? 'Starter plan is active. Good for workflow validation, not for paid customer operation.'
        : `Current account is operating on the ${input.planKey} tier.`,
  });

  checks.push({
    id: 'workflow',
    label: 'Recruiter workflow adoption',
    status: input.shortlistCount > 0 || input.savedCandidateCount > 0 ? 'pass' : 'warn',
    detail:
      input.shortlistCount > 0 || input.savedCandidateCount > 0
        ? `${input.shortlistCount} shortlist(s) and ${input.savedCandidateCount} saved candidate(s) exist in the workspace.`
        : 'Recruiter pipeline is available, but this account does not have saved workflow data yet.',
  });

  checks.push({
    id: 'signal',
    label: 'Evidence-based motion',
    status: input.savedCandidateCount > 0 ? 'pass' : 'warn',
    detail:
      input.savedCandidateCount > 0
        ? 'Search is feeding pipeline data, which is the core recruiting workflow.'
        : 'Search and profiles work, but the shortlist loop still needs active usage to prove value.',
  });

  return checks;
}

export function getReadinessScore(checks: ReadinessCheck[]) {
  return checks.reduce((score, check) => {
    if (check.status === 'pass') {
      return score + 25;
    }

    if (check.status === 'warn') {
      return score + 12;
    }

    return score;
  }, 0);
}
