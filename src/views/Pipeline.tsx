import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Download, ExternalLink, Plus, Trash2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { avatarPlaceholder } from '../lib/placeholders';
import { canCreateAnotherList, canExportCandidates } from '../lib/plans';
import {
  fetchRecruiterListCandidates,
  removeRecruiterListCandidate,
  updateRecruiterListCandidate,
} from '../services/revenue';
import type { PipelineStage, RecruiterListCandidate } from '../types';

const stageOrder: PipelineStage[] = ['new', 'outreach', 'screen', 'interview', 'offer', 'won', 'archived'];

const stageLabels: Record<PipelineStage, string> = {
  new: 'New',
  outreach: 'Outreach',
  screen: 'Screen',
  interview: 'Interview',
  offer: 'Offer',
  won: 'Won',
  archived: 'Archived',
};

export default function Pipeline() {
  useDocumentTitle('SkillOS - Recruiter Pipeline');

  const { profile } = useAuth();
  const { subscription, recruiterLists, loading, createList, refreshRevenue } = useRevenue();
  const { addToast } = useToast();
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [candidates, setCandidates] = useState<RecruiterListCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  useEffect(() => {
    if (!selectedListId && recruiterLists.length > 0) {
      setSelectedListId(recruiterLists[0].id);
    }
  }, [selectedListId, recruiterLists]);

  useEffect(() => {
    async function loadCandidates() {
      if (!profile || !selectedListId) {
        setCandidates([]);
        return;
      }

      try {
        setLoadingCandidates(true);
        setCandidates(await fetchRecruiterListCandidates(profile.id, selectedListId));
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Failed to load shortlist.', 'error');
      } finally {
        setLoadingCandidates(false);
      }
    }

    void loadCandidates();
  }, [addToast, profile, selectedListId]);

  const totalSavedCandidates = recruiterLists.reduce((sum, list) => sum + list.candidate_count, 0);
  const selectedList = recruiterLists.find((list) => list.id === selectedListId) || null;

  const groupedCandidates = useMemo(
    () =>
      stageOrder.map((stage) => ({
        stage,
        items: candidates.filter((candidate) => candidate.stage === stage),
      })),
    [candidates]
  );

  async function handleCreateList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!newListName.trim()) {
      addToast('List name is required.', 'error');
      return;
    }

    if (!canCreateAnotherList(subscription, recruiterLists.length)) {
      addToast('Your current plan has reached the shortlist limit.', 'error');
      return;
    }

    try {
      setCreatingList(true);
      const nextList = await createList(newListName.trim(), newListDescription.trim());
      setSelectedListId(nextList.id);
      setNewListName('');
      setNewListDescription('');
      addToast('Shortlist created.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to create shortlist.', 'error');
    } finally {
      setCreatingList(false);
    }
  }

  async function persistCandidate(
    candidateId: string,
    updates: Pick<RecruiterListCandidate, 'stage' | 'fit_score' | 'notes'>
  ) {
    if (!profile) {
      return;
    }

    try {
      await updateRecruiterListCandidate(profile.id, candidateId, updates);
      setCandidates((current) =>
        current.map((candidate) =>
          candidate.id === candidateId
            ? {
                ...candidate,
                ...updates,
                updated_at: new Date().toISOString(),
              }
            : candidate
        )
      );
      await refreshRevenue();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to update candidate.', 'error');
    }
  }

  async function handleRemoveCandidate(candidateId: string) {
    if (!profile) {
      return;
    }

    try {
      await removeRecruiterListCandidate(profile.id, candidateId);
      setCandidates((current) => current.filter((candidate) => candidate.id !== candidateId));
      await refreshRevenue();
      addToast('Candidate removed from shortlist.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Unable to remove candidate.', 'error');
    }
  }

  function exportCurrentList() {
    if (!selectedList || !candidates.length) {
      addToast('No shortlist data to export.', 'error');
      return;
    }

    if (!canExportCandidates(subscription)) {
      addToast('CSV exports are unlocked on Growth and above.', 'error');
      return;
    }

    const header = ['name', 'github_id', 'stage', 'fit_score', 'skills'];
    const rows = candidates.map((candidate) => [
      candidate.developer?.name || '',
      candidate.developer?.github_id || '',
      candidate.stage,
      String(candidate.fit_score),
      (candidate.developer?.skills || []).slice(0, 5).map((skill) => skill.name).join(' | '),
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedList.name.toLowerCase().replace(/\s+/g, '-')}-shortlist.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="workspace-page">
      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="page-kicker">Pipeline</div>
          <h1 className="mt-2 page-title">Recruiter pipeline</h1>
          <p className="mt-2 page-copy">
            Organize shortlists, track fit, move candidates through stages, and export hiring-ready lists.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button onClick={exportCurrentList} className="btn-secondary">
            <Download className="h-4 w-4" />
            Export shortlist
          </button>
          <Link to="/search" className="btn-primary">
            <Plus className="h-4 w-4" />
            Source candidates
          </Link>
        </div>
      </div>

      <div className="mb-7 grid gap-4 lg:grid-cols-4">
        <Metric label="Active shortlists" value={recruiterLists.length.toString()} />
        <Metric label="Saved candidates" value={totalSavedCandidates.toString()} />
        <Metric
          label="Median fit"
          value={
            candidates.length
              ? `${Math.round(
                  [...candidates].sort((left, right) => left.fit_score - right.fit_score)[Math.floor(candidates.length / 2)]
                    .fit_score
                )}%`
              : '0%'
          }
        />
        <Metric label="Seats in plan" value={subscription?.seats?.toString() || '1'} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px,1fr]">
        <aside className="space-y-6">
          <section className="surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Shortlists</h2>
                <p className="text-sm text-slate-500">
                  {loading ? 'Loading...' : `${recruiterLists.length} active list${recruiterLists.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <span className="chip">{subscription?.plan_key || 'starter'}</span>
            </div>

            <div className="space-y-2">
              {recruiterLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => setSelectedListId(list.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    selectedListId === list.id
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold text-slate-950">{list.name}</div>
                    <span className="text-xs font-semibold text-slate-500">{list.candidate_count}</span>
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{list.description || 'No description set.'}</div>
                </button>
              ))}
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-lg font-semibold text-slate-950">Create shortlist</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Use one shortlist per role, hiring team, region, or sourcing campaign.
            </p>

            <form onSubmit={handleCreateList} className="mt-5 space-y-3">
              <input
                value={newListName}
                onChange={(event) => setNewListName(event.target.value)}
                placeholder="Shortlist name"
                className="input-shell w-full"
              />
              <textarea
                value={newListDescription}
                onChange={(event) => setNewListDescription(event.target.value)}
                placeholder="Role, team, or hiring motion"
                rows={4}
                className="input-shell w-full"
              />
              <button
                type="submit"
                disabled={creatingList || !canCreateAnotherList(subscription, recruiterLists.length)}
                className="btn-primary w-full"
              >
                {creatingList ? 'Creating...' : 'Create shortlist'}
              </button>
            </form>
          </section>
        </aside>

        <section className="surface p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">{selectedList?.name || 'Select a shortlist'}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedList?.description || 'Move candidates through stages, record fit, and keep notes in one place.'}
              </p>
            </div>
            <div className="chip">{selectedList?.candidate_count || 0} candidates</div>
          </div>

          {loadingCandidates ? (
            <EmptyState title="Loading shortlist..." />
          ) : !selectedList ? (
            <EmptyState
              title="No shortlist selected"
              body="Create one on the left, then add candidates from recruiter search."
            />
          ) : candidates.length === 0 ? (
            <EmptyState
              title="This shortlist is empty"
              body="Recruiter search supports adding candidates directly into pipeline lists."
            />
          ) : (
            <div className="grid gap-4 2xl:grid-cols-3">
              {groupedCandidates.map((column) => (
                <div key={column.stage} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-600">{stageLabels[column.stage]}</h3>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {column.items.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {column.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                        No candidates in this stage.
                      </div>
                    ) : (
                      column.items.map((candidate) => (
                        <CandidateCard
                          key={candidate.id}
                          candidate={candidate}
                          onRemove={handleRemoveCandidate}
                          onPersist={persistCandidate}
                        />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function CandidateCard({
  candidate,
  onRemove,
  onPersist,
}: {
  candidate: RecruiterListCandidate;
  onRemove: (candidateId: string) => Promise<void>;
  onPersist: (
    candidateId: string,
    updates: Pick<RecruiterListCandidate, 'stage' | 'fit_score' | 'notes'>
  ) => Promise<void>;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <img
            src={candidate.developer?.avatar_url || avatarPlaceholder}
            alt={candidate.developer?.name || 'Candidate'}
            className="h-12 w-12 rounded-xl object-cover"
          />
          <div className="min-w-0">
            <div className="truncate font-semibold text-slate-950">
              {candidate.developer?.name || 'Candidate unavailable'}
            </div>
            <div className="truncate text-sm text-slate-500">@{candidate.developer?.github_id || 'unknown'}</div>
          </div>
        </div>
        <button
          onClick={() => void onRemove(candidate.id)}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-red-600"
          aria-label="Remove candidate"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(candidate.developer?.skills || []).slice(0, 4).map((skill) => (
          <span
            key={`${candidate.id}-${skill.name}`}
            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            {skill.name}
          </span>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium">Stage</span>
          <select
            value={candidate.stage}
            onChange={(event) =>
              void onPersist(candidate.id, {
                stage: event.target.value as PipelineStage,
                fit_score: candidate.fit_score,
                notes: candidate.notes,
              })
            }
            className="input-shell w-full px-3 py-2.5"
          >
            {stageOrder.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-600">
          <span className="mb-1 block font-medium">Fit score</span>
          <input
            type="number"
            min={0}
            max={100}
            defaultValue={candidate.fit_score}
            onBlur={(event) =>
              void onPersist(candidate.id, {
                stage: candidate.stage,
                fit_score: Number(event.target.value || 0),
                notes: candidate.notes,
              })
            }
            className="input-shell w-full px-3 py-2.5"
          />
        </label>
      </div>

      <label className="mb-4 block text-sm text-slate-600">
        <span className="mb-1 block font-medium">Notes</span>
        <textarea
          rows={4}
          defaultValue={candidate.notes}
          onBlur={(event) =>
            void onPersist(candidate.id, {
              stage: candidate.stage,
              fit_score: candidate.fit_score,
              notes: event.target.value,
            })
          }
          className="input-shell w-full px-3 py-2.5"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-emerald-700">{candidate.fit_score}% fit</span>
        {candidate.developer && (
          <Link
            to={`/dev/${candidate.developer.github_id}`}
            className="inline-flex items-center gap-1.5 font-medium text-blue-700 transition hover:text-blue-800"
          >
            Public profile
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-8 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-white shadow-sm">
        <Users className="h-7 w-7 text-slate-500" />
      </div>
      <h3 className="text-xl font-semibold text-slate-950">{title}</h3>
      {body && <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-panel">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
