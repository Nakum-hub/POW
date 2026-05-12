import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, GitCommitHorizontal, GitFork, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonText } from '../components/Skeleton';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { fetchRepoAnalysis, fetchUserRepositories } from '../services/api';
import { RepoAnalysis, Repository } from '../types';

type SortBy = 'stars' | 'commits' | 'quality' | 'recent';
type FilterType = 'all' | 'original' | 'active';

function RepositorySkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 h-5 w-1/3 rounded bg-gray-200 animate-pulse" />
      <SkeletonText lines={2} />
      <div className="mt-4 flex gap-3">
        <div className="h-4 w-16 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
        <div className="h-4 w-24 rounded bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}

export default function Repositories() {
  useDocumentTitle('SkillOS - Repositories');

  const { profile } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('stars');
  const [filter, setFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, RepoAnalysis | null>>({});

  const loadRepos = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await fetchUserRepositories(profile.id);
      setRepos(data);
    } catch (error) {
      console.error('Error loading repositories:', error);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      void loadRepos();
    }
  }, [profile, loadRepos]);

  async function toggleAnalysis(repoId: string) {
    if (expandedId === repoId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(repoId);

    if (!(repoId in analyses)) {
      try {
        const analysis = await fetchRepoAnalysis(repoId);
        setAnalyses((prev) => ({ ...prev, [repoId]: analysis }));
      } catch (error) {
        console.error('Error loading analysis:', error);
        setAnalyses((prev) => ({ ...prev, [repoId]: null }));
      }
    }
  }

  let filtered = repos.filter((repo) => {
    if (search && !repo.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'original' && repo.is_fork) return false;
    if (filter === 'active' && repo.last_activity_days > 180) return false;
    return true;
  });

  filtered = filtered.sort((a, b) => {
    switch (sortBy) {
      case 'commits':
        return b.commits - a.commits;
      case 'quality':
        return b.quality_score - a.quality_score;
      case 'recent':
        return a.last_activity_days - b.last_activity_days;
      case 'stars':
      default:
        return b.stars - a.stars;
    }
  });

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="mb-7 space-y-3">
          <div className="h-8 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-72 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <RepositorySkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (!repos.length) {
    return (
      <div className="workspace-page">
        <div className="mb-7">
          <h1 className="mb-1 text-2xl font-semibold text-gray-900">Repositories</h1>
          <p className="text-sm text-gray-600">All analyzed repositories.</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-gray-600">No repositories analyzed yet. Analyze your repos to see them here.</p>
        </div>
      </div>
    );
  }

  return (
      <div className="workspace-page">
      <div className="mb-7">
        <div className="page-kicker">Evidence</div>
        <h1 className="mt-2 page-title">Repositories</h1>
        <p className="text-sm text-gray-600">
          {filtered.length} of {repos.length} repositories
        </p>
      </div>

      <div className="surface mb-7 space-y-4 p-5">
        <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label className="mb-2 block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Search by repository name..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Sort by</label>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as SortBy)}
              className="rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:ring-2 focus:ring-blue-500"
            >
              <option value="stars">Stars</option>
              <option value="commits">Commits</option>
              <option value="quality">Quality Score</option>
              <option value="recent">Recent Activity</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Filter</label>
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as FilterType)}
              className="rounded-lg border border-gray-200 px-4 py-2 outline-none transition focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="original">Original Only</option>
              <option value="active">Active (Last 6 months)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((repo) => (
          <div
            key={repo.id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <a
                      href={`https://github.com/${repo.full_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 font-bold text-gray-900 hover:text-blue-600"
                    >
                      {repo.name}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {repo.is_fork && (
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                        Fork
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-1 text-sm text-gray-600">{repo.description || 'No description'}</p>
                </div>
                <div className="ml-4 text-right">
                  <div className="mb-1 text-xs font-semibold text-gray-500">Quality</div>
                  <div
                    className={`text-2xl font-bold ${
                      repo.quality_score >= 0.7
                        ? 'text-emerald-600'
                        : repo.quality_score >= 0.4
                        ? 'text-amber-600'
                        : 'text-red-500'
                    }`}
                  >
                    {Math.round(repo.quality_score * 100)}%
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <div className="mb-1.5 text-xs font-medium text-gray-600">Languages</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(repo.languages || {})
                    .slice(0, 3)
                    .map(([language, percent]) => (
                      <div key={language} className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        <span className="text-xs text-gray-700">
                          {language}: {Math.round(percent as number)}%
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="mb-3 flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" />
                  {repo.stars} stars
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-3.5 w-3.5" />
                  {repo.forks} forks
                </span>
                <span className="flex items-center gap-1">
                  <GitCommitHorizontal className="h-3.5 w-3.5" />
                  {repo.commits} commits
                </span>
                <span className="text-xs text-gray-500">Last active: {repo.last_activity_days} days ago</span>
              </div>

              <button
                onClick={() => void toggleAnalysis(repo.id)}
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {expandedId === repo.id ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Hide Analysis
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    View Analysis
                  </>
                )}
              </button>
            </div>

            {expandedId === repo.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-5">
                {analyses[repo.id] === undefined ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                    Loading analysis...
                  </div>
                ) : analyses[repo.id] === null ? (
                  <p className="text-sm text-gray-500">No detailed analysis available for this repository.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <AnalysisBar label="Quality" score={analyses[repo.id]!.quality_score} />
                    <AnalysisBar label="Complexity" score={analyses[repo.id]!.complexity_score} />
                    <AnalysisBar label="Security" score={analyses[repo.id]!.security_score} />
                    <AnalysisBar label="Testing" score={analyses[repo.id]!.testing_score} />
                    <AnalysisBar label="Maturity" score={analyses[repo.id]!.maturity_score} />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalysisBar({ label, score }: { label: string; score: number }) {
  const percentage = Math.max(0, Math.min(100, Math.round(score)));

  return (
    <div>
      <div className="mb-1.5 text-xs font-medium text-gray-700">{label}</div>
      <div className="mb-1 h-2 w-full rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full transition-all ${
            percentage >= 70 ? 'bg-emerald-500' : percentage >= 40 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="text-xs font-semibold text-gray-900">{percentage}%</div>
    </div>
  );
}
