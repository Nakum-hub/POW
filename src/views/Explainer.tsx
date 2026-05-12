import { useCallback, useEffect, useState } from 'react';
import { Copy, FileText, MessageSquareText, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toErrorMessage } from '../lib/errors';
import { fetchUserRepositories, generateProjectExplanation } from '../services/api';
import { Repository } from '../types';

export default function Explainer() {
  useDocumentTitle('SkillOS - Candidate Briefs');

  const { profile, session } = useAuth();
  const { addToast } = useToast();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [audience, setAudience] = useState<'hr' | 'technical'>('hr');
  const [explanation, setExplanation] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRepos = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const data = await fetchUserRepositories(profile.id);
      setRepos(data);
      if (data.length > 0) {
        setSelectedRepoId((current) => current || data[0].id);
      }
    } catch {
      addToast('Failed to load repositories', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, profile]);

  useEffect(() => {
    if (profile) {
      void loadRepos();
    }
  }, [profile, loadRepos]);

  async function generateExplanation() {
    if (!selectedRepoId) return;
    setGenerating(true);
    setExplanation('');

    try {
      const result = await generateProjectExplanation(selectedRepoId, audience, session?.access_token);
      setExplanation(result.explanation);
    } catch (error) {
      addToast(toErrorMessage(error, 'Failed to generate candidate brief.'), 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function copyExplanation() {
    if (!explanation) return;

    try {
      await navigator.clipboard.writeText(explanation);
      addToast('Candidate brief copied', 'success');
    } catch {
      addToast('Unable to copy candidate brief', 'error');
    }
  }

  const selectedRepo = repos.find((repo) => repo.id === selectedRepoId) || null;

  if (loading) {
    return (
      <div className="workspace-page max-w-6xl">
        <div className="mb-8 space-y-3">
          <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-9 w-72 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full max-w-xl animate-pulse rounded bg-slate-200" />
        </div>
        <div className="surface animate-pulse p-6">
          <div className="mb-4 h-12 w-full rounded-xl bg-slate-200" />
          <div className="mb-4 h-36 w-full rounded-xl bg-slate-200" />
          <div className="h-44 w-full rounded-xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <div className="workspace-page max-w-6xl">
        <div className="mb-7">
          <div className="page-kicker">Briefs</div>
          <h1 className="mt-2 page-title">Candidate Briefs</h1>
          <p className="mt-2 page-copy">Turn repository analysis into audience-specific summaries you can share.</p>
        </div>

        <div className="surface px-8 py-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
            <FileText className="h-7 w-7 text-blue-700" />
          </div>
          <h2 className="mb-2 text-xl font-semibold text-slate-950">Analyze repositories to create briefs.</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
            Briefs are built from analyzed repositories, languages, quality signals, and evidence records.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page max-w-6xl">
      <div className="mb-8">
        <div className="page-kicker">Briefs</div>
        <h1 className="mt-2 page-title">Candidate Briefs</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Prepare concise project summaries for recruiters or technical interviewers. Recruiting briefs focus on role
          fit and business value; technical briefs focus on architecture, stack decisions, and code quality signals.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr,1.05fr]">
        <div className="space-y-6">
          <div className="surface p-5 sm:p-6">
            <label className="mb-2 block text-sm font-semibold text-slate-950">Repository</label>
            <select
              value={selectedRepoId}
              onChange={(event) => setSelectedRepoId(event.target.value)}
              className="input-shell w-full"
            >
              {repos.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.name}
                </option>
              ))}
            </select>

            {selectedRepo && (
              <div className="mt-5 surface-inset p-5">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-950">{selectedRepo.name}</h2>
                  <span className="chip">{selectedRepo.language || 'Unknown'}</span>
                </div>
                <p className="mb-4 text-sm leading-6 text-slate-600">
                  {selectedRepo.description || 'No repository description available.'}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                  <span>{selectedRepo.stars} stars</span>
                  <span>{selectedRepo.commits} commits</span>
                  <span>{Math.round(selectedRepo.quality_score * 100)}% quality</span>
                </div>
              </div>
            )}
          </div>

          <div className="surface p-5 sm:p-6">
            <div className="mb-4 text-sm font-semibold text-slate-950">Audience</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AudienceButton
                active={audience === 'hr'}
                title="Recruiting brief"
                description="Translate engineering work into role fit, business value, and hiring signals."
                onClick={() => setAudience('hr')}
              />
              <AudienceButton
                active={audience === 'technical'}
                title="Technical brief"
                description="Focus on architecture, stack choices, complexity, and repository quality signals."
                onClick={() => setAudience('technical')}
              />
            </div>

            <button onClick={generateExplanation} disabled={!selectedRepoId || generating} className="btn-primary mt-5">
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <MessageSquareText className="h-4 w-4" />
                  Generate brief
                </>
              )}
            </button>
          </div>
        </div>

        <div className="surface p-5 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Prepared brief</h2>
              <p className="mt-1 text-sm text-slate-500">Use it in outbound notes, scorecards, or interview handoffs.</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={copyExplanation} disabled={!explanation} className="btn-secondary px-3 py-2">
                <Copy className="h-4 w-4" />
                Copy
              </button>
              <button onClick={generateExplanation} disabled={!selectedRepoId || generating} className="btn-secondary px-3 py-2">
                <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {explanation ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm leading-7 text-slate-800">
              <pre className="whitespace-pre-wrap font-sans">{explanation}</pre>
            </div>
          ) : (
            <div className="flex min-h-[22rem] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
                  <FileText className="h-7 w-7 text-slate-500" />
                </div>
                <p className="mx-auto max-w-md text-sm leading-6 text-slate-500">
                  Choose a repository and audience, then generate a candidate brief.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AudienceButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-4 py-4 text-left transition ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-950'
          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-950'
      }`}
    >
      <div className="font-semibold">{title}</div>
      <div className="mt-1 text-sm leading-6">{description}</div>
    </button>
  );
}
