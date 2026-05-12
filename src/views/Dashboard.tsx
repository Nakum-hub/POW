import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, GitCommitHorizontal, GitFork, RotateCw, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../components/Toast';
import { SkeletonCard, SkeletonStat } from '../components/Skeleton';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { analyzeRepositories, fetchUserRepositories, fetchUserSkills } from '../services/api';
import { Repository, UserSkill } from '../types';

export default function Dashboard() {
  useDocumentTitle('SkillOS - Dashboard');

  const navigate = useNavigate();
  const { profile, session } = useAuth();
  const { addToast } = useToast();
  const { isAnalyzing, setIsAnalyzing, analysisProgress, setAnalysisProgress, analysisStage, setAnalysisStage } = useApp();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!profile) return { reposData: [], skillsData: [] };

    try {
      setError(null);
      const [reposData, skillsData] = await Promise.all([
        fetchUserRepositories(profile.id),
        fetchUserSkills(profile.id),
      ]);

      setRepos(reposData);
      setSkills(skillsData);

      return { reposData, skillsData };
    } catch {
      setError('Failed to load your data. Please try again.');
      return { reposData: [], skillsData: [] };
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      void loadData();
    }
  }, [profile, loadData]);

  async function handleAnalyze() {
    if (!session?.access_token) {
      addToast('Authentication required', 'error');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisStage('Starting analysis...');

    try {
      await analyzeRepositories(session.access_token, session.provider_token || '', (progress, stage) => {
        setAnalysisProgress(progress);
        setAnalysisStage(stage);
      });

      await new Promise((resolve) => setTimeout(resolve, 800));
      const fresh = await loadData();

      addToast(
        `Analysis complete. Found ${fresh.skillsData.length} skills across ${fresh.reposData.length} repositories.`,
        'success'
      );
      setAnalysisProgress(0);
      setAnalysisStage('');
    } catch (err) {
      addToast(`Analysis failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
      setAnalysisProgress(0);
      setAnalysisStage('');
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonStat key={index} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      </div>
    );
  }

  if (error && !repos.length) {
    return (
      <div className="workspace-page">
        <div className="surface border-red-200 bg-red-50 p-5">
          <p className="font-medium text-red-800">{error}</p>
          <button onClick={() => void loadData()} className="mt-3 text-sm font-semibold text-red-700 hover:text-red-800">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!repos.length) {
    return (
      <div className="workspace-page">
        <div className="mb-7">
          <div className="page-kicker">Overview</div>
          <h1 className="mt-2 page-title">Build your verified skill profile</h1>
          <p className="mt-2 page-copy">
            Analyze repositories to create the evidence layer used by recruiter search, candidate briefs, and public
            profiles.
          </p>
        </div>

        <div className="surface px-8 py-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
            <Brain className="h-7 w-7 text-blue-700" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-950">No repository analysis yet</h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-6 text-slate-600">
            Repository analysis detects skills, evidence, quality signals, and confidence scores for your profile.
          </p>
          <button onClick={handleAnalyze} disabled={isAnalyzing} className="btn-primary">
            {isAnalyzing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </>
            ) : (
              'Analyze repositories'
            )}
          </button>
          <p className="mt-4 text-xs text-slate-500">Completion time depends on repository count and size.</p>
        </div>
      </div>
    );
  }

  const topSkills = skills.slice(0, 8);
  const totalCommits = repos.reduce((sum, repo) => sum + repo.commits, 0);
  const avgQuality = Math.round(
    (repos.reduce((sum, repo) => sum + Number(repo.quality_score || 0), 0) / repos.length) * 100
  );
  const highConfidenceSkills = skills.filter((skill) => skill.confidence >= 70).length;

  return (
    <div className="workspace-page">
      {isAnalyzing && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <span className="text-sm font-semibold text-blue-950">{analysisStage || 'Analyzing repositories...'}</span>
            </div>
            <span className="text-xs font-semibold text-blue-700">{analysisProgress}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-blue-200">
            <div className="h-2 rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${analysisProgress}%` }} />
          </div>
        </div>
      )}

      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-kicker">Overview</div>
          <h1 className="mt-2 page-title">Workspace overview</h1>
          <p className="mt-2 page-copy">Your profile is built from {repos.length} analyzed repositories.</p>
        </div>
        <button onClick={handleAnalyze} disabled={isAnalyzing} className="btn-secondary w-fit">
          <RotateCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          Re-analyze
        </button>
      </div>

      <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total skills" value={skills.length.toString()} />
        <MetricCard label="High confidence" value={highConfidenceSkills.toString()} tone="emerald" />
        <MetricCard label="Total commits" value={totalCommits.toLocaleString()} />
        <MetricCard label="Average quality" value={`${avgQuality}%`} tone="amber" />
      </div>

      <div className="mb-7 grid gap-6 xl:grid-cols-[1fr,0.85fr]">
        <section className="surface p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Top skills</h2>
              <p className="mt-1 text-sm text-slate-500">Highest confidence signals from analyzed repositories.</p>
            </div>
            <button onClick={() => navigate('/skills')} className="btn-secondary px-3 py-2">
              View all
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {topSkills.map((skill) => (
              <div key={skill.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                    {skill.skill?.category || 'skill'}
                  </span>
                  <span className="text-lg font-semibold text-blue-700">{skill.confidence}%</span>
                </div>
                <h3 className="mb-2 font-semibold text-slate-950">{skill.skill?.name || 'Unknown skill'}</h3>
                <div className="h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-blue-600" style={{ width: `${skill.confidence}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-950">Recruiter readiness</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Keep repository evidence current so candidate briefs, public profiles, and recruiter search stay defensible.
          </p>
          <div className="mt-5 space-y-3">
            {[
              ['Repository coverage', `${repos.length} repositories analyzed`],
              ['Signal depth', `${highConfidenceSkills} high-confidence skills`],
              ['Profile quality', `${avgQuality}% average repository quality`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold text-slate-500">{label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="surface p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-950">Recent repositories</h2>
        </div>
        <div className="space-y-3">
          {repos.slice(0, 5).map((repo) => (
            <div key={repo.id} className="table-row-panel">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 font-semibold text-slate-950">{repo.name}</h3>
                  <p className="mb-3 line-clamp-2 text-sm text-slate-600">{repo.description || 'No description available'}</p>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      {repo.language || 'Unknown'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5" />
                      {repo.stars}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitFork className="h-3.5 w-3.5" />
                      {repo.forks}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitCommitHorizontal className="h-3.5 w-3.5" />
                      {repo.commits}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-1 text-xs font-semibold text-slate-500">Quality</div>
                  <div className="text-xl font-semibold text-emerald-700">{Math.round(repo.quality_score * 100)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone = 'slate' }: { label: string; value: string; tone?: 'slate' | 'emerald' | 'amber' }) {
  const valueClass = tone === 'emerald' ? 'text-emerald-700' : tone === 'amber' ? 'text-amber-700' : 'text-slate-950';

  return (
    <div className="metric-panel">
      <div className="mb-1.5 text-sm font-medium text-slate-500">{label}</div>
      <div className={`text-3xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  );
}
