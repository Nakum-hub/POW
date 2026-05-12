import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Plus, Search as SearchIcon, ShieldCheck, User, X } from 'lucide-react';
import ConfidenceControl, { type ConfidenceOption } from '../components/ConfidenceControl';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  canCreateAnotherList,
  canSaveAnotherCandidate,
  getPlanDefinition,
  getSearchResultLimit,
  getUpgradeTarget,
} from '../lib/plans';
import type { SkillCategory } from '../types';
import { publicSkillCategoryOrder, skillCategoryMeta } from '../lib/skills';
import { avatarPlaceholder } from '../lib/placeholders';
import { fetchDeveloperTopRepositories, searchDeveloperProfiles, type SearchCategory } from '../services/api';
import { saveDeveloperToRecruiterList } from '../services/revenue';

interface DeveloperResult {
  user_id: string;
  github_id: string;
  name: string;
  avatar_url: string;
  show_confidence: boolean;
  skills: Array<{ name: string; category: SkillCategory; confidence: number }>;
}

interface ModalDev extends DeveloperResult {
  repos: Array<{ name: string; stars: number; language: string; quality_score: number }>;
}

const confidenceOptions: ConfidenceOption[] = [
  { value: 40, label: 'Open', description: 'Cast a wider net and include emerging skill signals.' },
  { value: 60, label: 'Qualified', description: 'Balanced default for credible public profile matches.' },
  { value: 75, label: 'Strong', description: 'Focus on candidates with consistently high-confidence evidence.' },
  { value: 90, label: 'Exceptional', description: 'Only surface profiles with the strongest public evidence.' },
];

function SearchSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="surface animate-pulse p-5">
          <div className="mb-5 flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-1/2 rounded bg-slate-200" />
            </div>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((__, chipIndex) => (
              <div key={chipIndex} className="h-7 w-24 rounded-full bg-slate-200" />
            ))}
          </div>
          <div className="h-10 w-full rounded-lg bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function PublicSearchHeader() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold text-slate-950">SkillOS</div>
            <div className="text-xs text-slate-500">Verified developer search</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-secondary hidden sm:inline-flex">
            Claim profile
          </Link>
          <Link to="/" className="btn-primary">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Search() {
  useDocumentTitle('SkillOS - Recruiter Search');

  const { user, profile } = useAuth();
  const { subscription, recruiterLists, createList, refreshRevenue } = useRevenue();
  const { addToast } = useToast();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [minConfidence, setMinConfidence] = useState(60);
  const [category, setCategory] = useState<SearchCategory>('all');
  const [results, setResults] = useState<DeveloperResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeveloper, setActiveDeveloper] = useState<ModalDev | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const totalSavedCandidates = recruiterLists.reduce((sum, list) => sum + list.candidate_count, 0);
  const visibleResultLimit = getSearchResultLimit(subscription);
  const visibleResults = Number.isFinite(visibleResultLimit) ? results.slice(0, visibleResultLimit) : results;
  const currentPlan = getPlanDefinition(subscription?.plan_key || 'starter');
  const upgradePlan = getPlanDefinition(getUpgradeTarget(subscription?.plan_key || 'starter'));

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      try {
        setLoading(true);
        setError(null);
        const developers = await searchDeveloperProfiles(debouncedQuery, minConfidence, category);
        if (!cancelled) {
          setResults(developers);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to search developers.');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void runSearch();
    return () => {
      cancelled = true;
    };
  }, [category, debouncedQuery, minConfidence]);

  async function openDeveloperModal(developer: DeveloperResult) {
    try {
      setModalLoading(true);
      setActiveDeveloper({ ...developer, repos: [] });

      const repos = await fetchDeveloperTopRepositories(developer.user_id, 3);
      setActiveDeveloper({ ...developer, repos });
    } catch {
      addToast('Failed to load candidate details', 'error');
      setActiveDeveloper(null);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleSaveToPipeline(developer: DeveloperResult) {
    if (!user || !profile) {
      addToast('Sign in to add candidates to a shortlist.', 'error');
      return;
    }

    if (!canSaveAnotherCandidate(subscription, totalSavedCandidates)) {
      addToast(`Your current plan is capped. Upgrade to ${upgradePlan.name} to save more candidates.`, 'error');
      return;
    }

    try {
      let targetList = recruiterLists[0];

      if (!targetList) {
        if (!canCreateAnotherList(subscription, recruiterLists.length)) {
          addToast(`Create more shortlists on ${upgradePlan.name} or above.`, 'error');
          return;
        }

        targetList = await createList('Primary shortlist', 'Default shortlist created from recruiter search.');
      }

      await saveDeveloperToRecruiterList(profile.id, targetList.id, developer);
      await refreshRevenue();
      addToast(`Added ${developer.name} to ${targetList.name}.`, 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to save candidate.', 'error');
    }
  }

  const tabs: Array<{ label: string; value: SearchCategory }> = [
    { label: 'All', value: 'all' },
    { label: 'Languages', value: 'language' },
    { label: 'Frameworks', value: 'framework' },
    { label: 'Concepts', value: 'concept' },
    { label: 'DevOps', value: 'devops' },
    { label: 'Databases', value: 'database' },
  ];

  const content = (
    <div className="workspace-page">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-kicker">Search</div>
          <h1 className="mt-2 page-title">Recruiter Search</h1>
          <p className="mt-2 page-copy">
            Find public developer profiles by skill confidence, category, and verified repository evidence.
          </p>
        </div>
        <div className="surface-subtle px-4 py-3 text-sm leading-6 text-slate-600 lg:max-w-xs">
          Search results are limited to public SkillOS profiles with available repository evidence.
        </div>
      </div>

      <div className="surface mb-6 p-5">
        <div className="relative mb-5">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by skill, framework, language, or concept"
            className="input-shell w-full pl-12"
          />
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCategory(tab.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                category === tab.value
                  ? 'bg-slate-950 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <ConfidenceControl
          label="Minimum confidence"
          value={minConfidence}
          options={confidenceOptions}
          onChange={setMinConfidence}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          {loading ? 'Searching candidate index...' : `${results.length} candidate${results.length === 1 ? '' : 's'} found`}
        </p>
        {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      </div>

      {user && (
        <div className="surface mb-4 px-5 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-950">{currentPlan.name} plan</div>
              <div className="text-sm text-slate-500">
                {totalSavedCandidates} saved candidate{totalSavedCandidates === 1 ? '' : 's'} across {recruiterLists.length}{' '}
                shortlist{recruiterLists.length === 1 ? '' : 's'}.
              </div>
            </div>
            <Link to="/billing" className="btn-secondary w-fit">
              Review plan limits
            </Link>
          </div>
        </div>
      )}

      {!loading && Number.isFinite(visibleResultLimit) && results.length > visibleResultLimit && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm leading-6 text-blue-950">
          Showing the top {visibleResults.length} matches on your current plan. Upgrade to {upgradePlan.name} for a
          larger candidate pool and more shortlist capacity.
        </div>
      )}

      {loading ? (
        <SearchSkeleton />
      ) : results.length === 0 ? (
        <div className="surface border-dashed px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
            <User className="h-7 w-7 text-slate-500" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-950">No candidates match this search.</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
            Try a related skill, broaden the category, or lower the confidence threshold.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleResults.map((developer) => (
            <div key={developer.user_id} className="surface p-5 transition hover:border-slate-300 hover:shadow-md">
              <div className="mb-5 flex items-start gap-4">
                <img
                  src={developer.avatar_url || avatarPlaceholder}
                  alt={developer.name}
                  className="h-14 w-14 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-semibold text-slate-950">{developer.name}</div>
                  <div className="truncate text-sm text-slate-500">@{developer.github_id}</div>
                </div>
              </div>

              <div className="mb-6 flex min-h-[72px] flex-wrap content-start gap-2">
                {developer.skills.slice(0, 5).map((skill) => (
                  <span
                    key={`${developer.user_id}-${skill.name}`}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${skillCategoryMeta[skill.category].badgeClass}`}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={() => void openDeveloperModal(developer)} className="btn-primary">
                  View profile
                </button>
                <button onClick={() => void handleSaveToPipeline(developer)} className="btn-secondary">
                  <Plus className="h-4 w-4" />
                  Add to shortlist
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeDeveloper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-4">
                <img
                  src={activeDeveloper.avatar_url || avatarPlaceholder}
                  alt={activeDeveloper.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div>
                  <h2 className="text-2xl font-semibold text-slate-950">{activeDeveloper.name}</h2>
                  <p className="text-sm text-slate-500">@{activeDeveloper.github_id}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveDeveloper(null)}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                aria-label="Close profile modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-8 px-6 py-6 lg:grid-cols-[1.4fr,0.8fr]">
              <div>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-sm font-semibold text-slate-500">Verified skills</h3>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => void handleSaveToPipeline(activeDeveloper)} className="btn-secondary px-3 py-2">
                      <Plus className="h-4 w-4" />
                      Add to shortlist
                    </button>
                    <Link to={`/dev/${activeDeveloper.github_id}`} className="btn-secondary px-3 py-2">
                      Public profile
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-5">
                  {publicSkillCategoryOrder
                    .filter((group) => activeDeveloper.skills.some((skill) => skill.category === group))
                    .map((group) => (
                      <div key={group}>
                        <h4 className="mb-2 text-sm font-semibold text-slate-950">{skillCategoryMeta[group].label}</h4>
                        <div className="flex flex-wrap gap-2">
                          {activeDeveloper.skills
                            .filter((skill) => skill.category === group)
                            .map((skill) => (
                              <span
                                key={`${group}-${skill.name}`}
                                className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${skillCategoryMeta[group].badgeClass}`}
                              >
                                {skill.name}
                                {activeDeveloper.show_confidence && (
                                  <span className="ml-2 font-semibold">{skill.confidence}%</span>
                                )}
                              </span>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm font-semibold text-slate-500">Top repositories</h3>
                <div className="space-y-3">
                  {modalLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="animate-pulse rounded-xl border border-slate-200 p-4">
                        <div className="mb-2 h-4 w-2/3 rounded bg-slate-200" />
                        <div className="mb-3 h-3 w-1/2 rounded bg-slate-200" />
                        <div className="h-3 w-full rounded bg-slate-200" />
                      </div>
                    ))
                  ) : activeDeveloper.repos.length > 0 ? (
                    activeDeveloper.repos.map((repo) => (
                      <div key={repo.name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <h4 className="truncate font-semibold text-slate-950">{repo.name}</h4>
                          <span className="text-sm font-semibold text-emerald-700">
                            {Math.round(repo.quality_score * 100)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>{repo.language || 'Unknown'}</span>
                          <span>{repo.stars} stars</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      No public repositories available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <PublicSearchHeader />
        {content}
      </div>
    );
  }

  return <div className="bg-[var(--app-bg)]">{content}</div>;
}
