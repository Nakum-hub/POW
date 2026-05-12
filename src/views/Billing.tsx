import type { ReactNode } from 'react';
import { ArrowRight, CheckCircle2, Layers3, ShieldCheck, Users } from 'lucide-react';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  formatPlanPrice,
  getPlanDefinition,
  getPlanEntitlements,
  getUpgradeTarget,
  planDefinitions,
} from '../lib/plans';
import { changeWorkspaceSubscriptionPlan } from '../services/revenue';

export default function Billing() {
  useDocumentTitle('SkillOS - Billing & Plans');

  const { profile, mode } = useAuth();
  const { subscription, recruiterLists, refreshRevenue } = useRevenue();
  const { addToast } = useToast();

  const currentPlan = getPlanDefinition(subscription?.plan_key || 'starter');
  const entitlements = getPlanEntitlements(subscription);

  async function handlePlanChange(planKey: typeof currentPlan.key) {
    if (!profile) {
      addToast('Authentication required', 'error');
      return;
    }

    try {
      await changeWorkspaceSubscriptionPlan(profile.id, planKey);
      await refreshRevenue();
      addToast(`Workspace plan changed to ${getPlanDefinition(planKey).name}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to change plan.', 'error');
    }
  }

  return (
    <div className="workspace-page">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-kicker">Billing</div>
          <h1 className="mt-2 page-title">Plans and workspace capacity</h1>
          <p className="mt-2 page-copy">
            Manage the plan limits that control search depth, recruiter seats, shortlists, exports, and candidate brief
            volume.
          </p>
        </div>

        <div className="surface w-full px-5 py-4 lg:w-[340px]">
          <div className="text-sm font-medium text-slate-500">Current plan</div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${currentPlan.badgeClass}`}>
              {currentPlan.name}
            </span>
            <span className="text-sm font-semibold text-slate-950">{subscription?.status || 'trialing'}</span>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-600">
            Plan limits are reflected immediately across search, pipeline, exports, and team workflow controls.
          </div>
        </div>
      </div>

      <div className="mb-7 grid gap-4 lg:grid-cols-4">
        <StatCard label="Shortlists" value={recruiterLists.length.toString()} icon={<Layers3 className="h-5 w-5 text-blue-700" />} />
        <StatCard
          label="Saved candidates"
          value={recruiterLists.reduce((sum, list) => sum + list.candidate_count, 0).toString()}
          icon={<Users className="h-5 w-5 text-emerald-700" />}
        />
        <StatCard
          label="Seats included"
          value={entitlements.seats_included === Number.POSITIVE_INFINITY ? 'Unlimited' : entitlements.seats_included.toString()}
          icon={<ShieldCheck className="h-5 w-5 text-slate-700" />}
        />
        <StatCard
          label="Monthly value target"
          value={
            currentPlan.monthlyValueTarget > 0 ? `$${currentPlan.monthlyValueTarget.toLocaleString()}` : 'Custom'
          }
          icon={<ArrowRight className="h-5 w-5 text-amber-700" />}
        />
      </div>

      <section className="surface mb-7 p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-950">Plan options</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Start with a focused recruiter workflow, then expand into larger shortlists, exports, analytics, and managed
            rollout support as usage grows.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {planDefinitions.map((plan) => {
            const isCurrentPlan = plan.key === currentPlan.key;
            const nextUpgrade = getUpgradeTarget(currentPlan.key);
            const canSwitchInWorkspace = mode === 'demo' && !isCurrentPlan;

            return (
              <div
                key={plan.key}
                className={`flex h-full flex-col rounded-2xl border bg-white p-5 ${
                  plan.recommended ? 'border-blue-200 ring-1 ring-blue-100' : 'border-slate-200'
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${plan.badgeClass}`}>
                      {plan.name}
                    </div>
                    <div className="mt-3 text-3xl font-semibold text-slate-950">
                      {plan.key === 'starter' ? 'Free' : formatPlanPrice(plan)}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{plan.buyer}</div>
                  </div>
                  {plan.recommended && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      Recommended
                    </span>
                  )}
                </div>

                <p className="mb-5 text-sm leading-6 text-slate-600">{plan.summary}</p>

                <div className="mb-5 space-y-2 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto">
                  {isCurrentPlan ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-center text-sm font-semibold text-slate-700">
                      Active plan
                    </div>
                  ) : canSwitchInWorkspace ? (
                    <button onClick={() => void handlePlanChange(plan.key)} className="btn-primary w-full">
                      Switch to {plan.name}
                    </button>
                  ) : (
                    <a
                      href={`mailto:sales@skillos.ai?subject=SkillOS%20${encodeURIComponent(
                        plan.name
                      )}%20Plan&body=Current%20plan:%20${encodeURIComponent(
                        currentPlan.name
                      )}%0ARequested%20plan:%20${encodeURIComponent(plan.name)}%0AAccount:%20${encodeURIComponent(
                        profile?.github_id || 'anonymous'
                      )}`}
                      className="btn-primary w-full"
                    >
                      {plan.key === nextUpgrade ? 'Request upgrade' : 'Talk to sales'}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <div className="surface p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-950">Current entitlements</h2>
          <div className="mt-5 space-y-3">
            <EntitlementRow label="Search results per query" value={formatLimit(entitlements.search_results_limit)} />
            <EntitlementRow label="Shortlists" value={formatLimit(entitlements.saved_lists_limit)} />
            <EntitlementRow label="Saved candidates" value={formatLimit(entitlements.saved_candidates_limit)} />
            <EntitlementRow label="Monthly exports" value={formatLimit(entitlements.monthly_exports_limit)} />
            <EntitlementRow label="Candidate briefs" value={formatLimit(entitlements.ai_briefs_limit)} />
            <EntitlementRow
              label="Pipeline analytics"
              value={entitlements.includes_pipeline_analytics ? 'Included' : 'Upgrade required'}
            />
            <EntitlementRow
              label="Onboarding support"
              value={entitlements.includes_white_glove_onboarding ? 'Managed rollout' : 'Self-serve'}
            />
          </div>
        </div>

        <div className="surface p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-950">Rollout guidance</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <GuidanceNote
              title="Best starter motion"
              body="Use Starter to prove the evidence-led workflow with a focused shortlist and hiring manager review."
            />
            <GuidanceNote
              title="Recommended team tier"
              body="Growth adds team seats, exports, and enough shortlist capacity for weekly recruiter usage."
            />
            <GuidanceNote
              title="Expansion signals"
              body="More saved candidates, more shortlists, and additional recruiter seats indicate healthy account growth."
            />
            <GuidanceNote
              title="Enterprise readiness"
              body="Scale and Enterprise are designed for analytics, rollout support, compliance review, and larger hiring teams."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="metric-panel">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50">{icon}</div>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function EntitlementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <span className="text-sm font-semibold text-slate-950">{value}</span>
    </div>
  );
}

function GuidanceNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-950">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
    </div>
  );
}

function formatLimit(value: number) {
  if (!Number.isFinite(value)) {
    return 'Unlimited';
  }

  return value.toLocaleString();
}
