import { ArrowRight, CheckCircle2, FileText, Github, GitBranch, Search, ShieldCheck, Users, Workflow } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toErrorMessage } from '../lib/errors';
import { formatPlanPrice, planDefinitions } from '../lib/plans';

export default function Landing() {
  useDocumentTitle('SkillOS - Verified Developer Skill Intelligence');

  const { mode, signInWithGitHub } = useAuth();
  const { addToast } = useToast();

  async function handleSignIn() {
    try {
      await signInWithGitHub();
    } catch (error) {
      addToast(toErrorMessage(error, 'Unable to start sign-in.'), 'error');
    }
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-950">SkillOS</div>
              <div className="text-xs text-slate-500">Verified hiring workspace</div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link to="/search" className="btn-secondary hidden sm:inline-flex">
              Search talent
            </Link>
            <button onClick={handleSignIn} className="btn-primary">
              <Github className="h-4 w-4" />
              {mode === 'demo' ? 'Open workspace' : 'Connect GitHub'}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-7 lg:grid-cols-[0.95fr,1.05fr] lg:px-10 lg:py-16">
            <div className="flex flex-col justify-center">
              <div className="chip mb-5 w-fit">
                <ShieldCheck className="h-3.5 w-3.5 text-blue-700" />
                Evidence-led recruiting
              </div>
              <h1 className="max-w-2xl text-5xl font-semibold leading-[1.02] text-slate-950 sm:text-6xl lg:text-7xl">
                SkillOS
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
                A recruiter workspace for finding engineers through shipped work, repository evidence, skill confidence,
                and hiring-ready candidate briefs.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={handleSignIn} className="btn-primary px-5 py-3">
                  {mode === 'demo' ? 'Open workspace' : 'Connect GitHub'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <Link to="/search" className="btn-secondary px-5 py-3">
                  Explore recruiter search
                </Link>
              </div>
              <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                {[
                  ['92%', 'Verified confidence'],
                  ['18', 'Repositories analyzed'],
                  ['4', 'Shortlist stages'],
                ].map(([value, label]) => (
                  <div key={label} className="surface-inset px-4 py-3">
                    <div className="text-2xl font-semibold text-slate-950">{value}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface p-4 sm:p-5">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500">Candidate brief</div>
                  <div className="mt-1 text-xl font-semibold text-slate-950">Aarav Rao</div>
                </div>
                <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">Verified</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Primary stack', value: 'TypeScript, React, PostgreSQL' },
                  { label: 'Fit signal', value: 'Frontend platform roles' },
                  { label: 'Repository quality', value: 'Strong test and documentation signal' },
                  { label: 'Handoff status', value: 'Ready for hiring manager review' },
                ].map((item) => (
                  <div key={item.label} className="surface-inset p-4">
                    <div className="text-xs font-semibold text-slate-500">{item.label}</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-950">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 surface-inset p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-950">Skill confidence</div>
                  <div className="text-xs text-slate-500">Evidence weighted</div>
                </div>
                <div className="space-y-4">
                  {[
                    ['TypeScript', 92],
                    ['React', 89],
                    ['PostgreSQL', 76],
                  ].map(([name, value]) => (
                    <div key={name}>
                      <div className="mb-1.5 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{name}</span>
                        <span className="font-semibold text-slate-950">{value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: Search, label: 'Search' },
                  { icon: Users, label: 'Shortlist' },
                  { icon: FileText, label: 'Brief' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-7 lg:px-10">
          <div className="mb-8 max-w-3xl">
            <div className="page-kicker">Workflow</div>
            <h2 className="mt-2 page-title">From public code to recruiter action.</h2>
            <p className="mt-3 page-copy">
              SkillOS turns repository evidence into a structured hiring workspace for sourcing, shortlisting, and
              sharing candidates with hiring teams.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: Github,
                title: 'Connect repository evidence',
                description: 'Candidates or sourcing teams bring in public GitHub history for structured review.',
              },
              {
                icon: Workflow,
                title: 'Evaluate skill signals',
                description: 'Languages, frameworks, practices, activity, and repository quality become ranked signals.',
              },
              {
                icon: Search,
                title: 'Run the recruiter workflow',
                description: 'Recruiters search, shortlist, annotate, and prepare hiring manager handoffs in one place.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="surface p-5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-950">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-7 lg:grid-cols-[0.9fr,1.1fr] lg:px-10">
            <div>
              <div className="page-kicker">Buyer value</div>
              <h2 className="mt-2 page-title">A defensible candidate brief for hiring managers.</h2>
              <p className="mt-3 page-copy">
                Recruiters can explain why a candidate is worth attention using repository evidence, stack depth, recent
                work, and confidence thresholds.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: 'Verified skills', icon: ShieldCheck },
                { title: 'Repository-level evidence', icon: GitBranch },
                { title: 'Recruiter shortlist workflow', icon: Users },
                { title: 'Shareable candidate briefs', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="surface-inset p-4">
                    <Icon className="mb-3 h-5 w-5 text-blue-700" />
                    <div className="text-sm font-semibold text-slate-950">{item.title}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-7 lg:px-10">
          <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="page-kicker">Plans</div>
              <h2 className="mt-2 page-title">Pricing built around recruiter workflow depth.</h2>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">
              Plans scale by seats, shortlist capacity, exports, and onboarding support, which keeps monetization tied
              to recruiting usage.
            </p>
          </div>

          <div className="grid gap-4 xl:grid-cols-4">
            {planDefinitions.map((plan) => (
              <div
                key={plan.key}
                className={`surface flex h-full flex-col p-5 ${
                  plan.recommended ? 'border-blue-200 ring-1 ring-blue-100' : ''
                }`}
              >
                <div className={`mb-4 inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${plan.badgeClass}`}>
                  {plan.name}
                </div>
                <div className="text-3xl font-semibold text-slate-950">
                  {plan.key === 'starter' ? 'Free' : plan.key === 'enterprise' ? 'Custom' : formatPlanPrice(plan)}
                </div>
                <div className="mt-1 text-sm text-slate-500">{plan.buyer}</div>
                <p className="mt-4 text-sm leading-6 text-slate-600">{plan.summary}</p>
                <div className="mt-5 space-y-2 text-sm text-slate-700">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-7 lg:px-10">
          <div className="surface flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="page-kicker">Start</div>
              <h2 className="mt-2 text-3xl font-semibold text-slate-950">Open a workspace and review the hiring flow.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Search verified engineers, build shortlists, and prepare candidate briefs with evidence hiring teams can
                review.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSignIn} className="btn-primary">
                {mode === 'demo' ? 'Open workspace' : 'Connect GitHub'}
              </button>
              <Link to="/search" className="btn-secondary">
                Browse talent
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:px-7 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>SkillOS makes developer hiring evidence-led.</div>
          <div className="flex flex-wrap gap-5">
            <Link to="/" className="transition hover:text-slate-950">
              About
            </Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="transition hover:text-slate-950">
              GitHub
            </a>
            <span>Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
