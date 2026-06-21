import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Github, LogOut, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRevenue } from '../contexts/RevenueContext';
import { useToast } from '../components/Toast';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { toErrorMessage } from '../lib/errors';
import { avatarPlaceholder } from '../lib/placeholders';
import { getPlanDefinition } from '../lib/plans';
import { getReadinessChecks, getReadinessScore } from '../lib/readiness';
import { forceDemoMode, hasSupabaseConfig } from '../lib/supabase';
import {
  analyzeRepositories,
  deleteAccount,
  deleteAnalysisOnly,
  fetchUserProfile,
  fetchUserRepositories,
  fetchUserSkills,
  updateProfileVisibility,
} from '../services/api';
import { Profile } from '../types';

function SettingsToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div>
        <div className="font-semibold text-gray-900">{title}</div>
        <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative mt-1 inline-flex h-7 w-12 flex-shrink-0 rounded-full transition ${
          checked ? 'bg-blue-600' : 'bg-gray-300'
        }`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? 'left-6' : 'left-1'
          }`}
        />
      </button>
    </div>
  );
}

function ConfirmationModal({
  title,
  description,
  confirmLabel,
  confirmVariant = 'danger',
  onCancel,
  onConfirm,
  confirmDisabled = false,
  children,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'neutral';
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-2xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{description}</p>
        {children}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="btn-secondary px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 ${
              confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  useDocumentTitle('SkillOS - Settings');

  const navigate = useNavigate();
  const { mode, profile, refreshProfile, session, signOut } = useAuth();
  const { subscription, recruiterLists } = useRevenue();
  const { addToast } = useToast();
  const [profileState, setProfileState] = useState<Profile | null>(profile);
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true);
  const [showConfidence, setShowConfidence] = useState(profile?.show_confidence ?? true);
  const [repoCount, setRepoCount] = useState(0);
  const [skillCount, setSkillCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState(0);
  const [reanalyzeStage, setReanalyzeStage] = useState('');
  const [showDeleteAnalysisModal, setShowDeleteAnalysisModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [accountConfirmation, setAccountConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);

  const loadSettingsData = useCallback(async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const [latestProfile, repos, skills] = await Promise.all([
        fetchUserProfile(profile.id),
        fetchUserRepositories(profile.id),
        fetchUserSkills(profile.id),
      ]);

      if (!latestProfile) {
        throw new Error('Profile not found');
      }

      setProfileState(latestProfile);
      setIsPublic(latestProfile.is_public ?? true);
      setShowConfidence(latestProfile.show_confidence ?? true);
      setRepoCount(repos.length);
      setSkillCount(skills.length);
    } catch (error) {
      addToast(toErrorMessage(error, 'Failed to load settings.'), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, profile]);

  useEffect(() => {
    if (profile) {
      void loadSettingsData();
    }
  }, [profile, loadSettingsData]);

  async function saveVisibility() {
    if (!profileState) return;

    try {
      setSavingVisibility(true);
      const data = await updateProfileVisibility(profileState.id, {
        is_public: isPublic,
        show_confidence: showConfidence,
      });

      if (!data) {
        throw new Error('Profile update failed');
      }

      setProfileState(data);
      await refreshProfile();
      addToast('Settings saved', 'success');
    } catch (error) {
      addToast(toErrorMessage(error, 'Failed to save settings.'), 'error');
    } finally {
      setSavingVisibility(false);
    }
  }

  async function handleReanalyze() {
    if (!session?.access_token) {
      addToast('Authentication required', 'error');
      return;
    }

    try {
      setReanalyzing(true);
      setReanalyzeProgress(0);
      setReanalyzeStage('Starting analysis...');
      await analyzeRepositories(session.access_token, session.provider_token || '', (progress, stage) => {
        setReanalyzeProgress(progress);
        setReanalyzeStage(stage);
      });
      await refreshProfile();
      const [freshSkills, freshRepos, refreshedProfile] = await Promise.all([
        fetchUserSkills(profileState!.id),
        fetchUserRepositories(profileState!.id),
        fetchUserProfile(profileState!.id),
      ]);

      setSkillCount(freshSkills.length);
      setRepoCount(freshRepos.length);
      if (refreshedProfile) {
        setProfileState(refreshedProfile);
      }

      addToast(
        `Analysis complete! Found ${freshSkills.length} skills across ${freshRepos.length} repositories.`,
        'success'
      );
    } catch (error) {
      addToast(toErrorMessage(error, 'Analysis failed.'), 'error');
    } finally {
      setReanalyzing(false);
      setReanalyzeProgress(0);
      setReanalyzeStage('');
    }
  }

  async function handleDeleteAnalysis() {
    if (!profileState) return;

    try {
      setDeleting(true);
      await deleteAnalysisOnly(profileState.id);
      await loadSettingsData();
      setShowDeleteAnalysisModal(false);
      addToast('Analysis data deleted', 'success');
    } catch (error) {
      addToast(toErrorMessage(error, 'Failed to delete analysis data.'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!profileState || !session?.access_token) return;

    try {
      setDeleting(true);
      await deleteAccount(session.access_token, profileState.id);
      await signOut();
      navigate('/', { replace: true });
    } catch (error) {
      addToast(toErrorMessage(error, 'Failed to delete account.'), 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function copyProfileUrl() {
    const url = `${window.location.origin}/dev/${profileState?.github_id}`;

    try {
      await navigator.clipboard.writeText(url);
      addToast('Profile URL copied!', 'success');
    } catch {
      addToast('Unable to copy profile URL', 'error');
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      navigate('/', { replace: true });
    } catch {
      addToast('Failed to sign out', 'error');
    }
  }

  const publicProfileUrl = `${window.location.origin}/dev/${profileState?.github_id || ''}`;
  const canDeleteAccount = accountConfirmation === profileState?.github_id;
  const readinessChecks = getReadinessChecks({
    activeMode: mode,
    forceDemoMode,
    hasSupabaseConfig,
    planKey: subscription?.plan_key || 'starter',
    shortlistCount: recruiterLists.length,
    savedCandidateCount: recruiterLists.reduce((sum, list) => sum + list.candidate_count, 0),
  });
  const readinessScore = getReadinessScore(readinessChecks);

  if (loading || !profileState) {
    return (
      <div className="workspace-narrow">
        <div className="surface animate-pulse p-6">
          <div className="mb-6 h-6 w-32 rounded bg-gray-200" />
          <div className="mb-6 flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gray-200" />
            <div className="space-y-3">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="h-3 w-28 rounded bg-gray-200" />
            </div>
          </div>
          <div className="h-24 rounded-2xl bg-gray-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-narrow">
      <div className="mb-8">
        <div className="page-kicker">Settings</div>
        <h1 className="mt-2 page-title">Workspace settings</h1>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Manage your public profile, repository analysis, and account lifecycle.
        </p>
      </div>

      <div className="space-y-6">
        <section className="surface p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900">Profile</h2>
            <button
              onClick={handleReanalyze}
              disabled={reanalyzing}
              className="btn-primary"
            >
              <RefreshCw className={`h-4 w-4 ${reanalyzing ? 'animate-spin' : ''}`} />
              {reanalyzing ? 'Analyzing...' : 'Re-analyze repositories'}
            </button>
          </div>

          {reanalyzing && (
            <div className="mb-5 rounded-2xl border border-blue-200 bg-blue-50 p-4" role="status" aria-live="polite">
              <div className="mb-2 flex items-center justify-between text-sm font-medium text-blue-900">
                <span className="truncate pr-3">{reanalyzeStage || 'Analyzing repositories...'}</span>
                <span className="tabular-nums">{reanalyzeProgress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
                  style={{ width: `${Math.min(Math.max(reanalyzeProgress, 0), 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
            <img
              src={profileState.avatar_url || avatarPlaceholder}
              alt={profileState.name}
                className="h-20 w-20 rounded-2xl object-cover"
            />
            <div className="flex-1">
              <div className="text-xl font-bold text-gray-900">{profileState.name}</div>
              <div className="text-sm text-gray-500">@{profileState.github_id}</div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {mode === 'demo' ? 'Sandbox workspace' : 'Connected'}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600">
                  <Github className="h-4 w-4" />
                  {repoCount} repositories
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 font-medium text-gray-600">
                  {skillCount} skills detected
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-sm font-semibold text-gray-900">GitHub connection</div>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {mode === 'demo'
                  ? 'Sandbox data is active while the production backend is being configured.'
                  : 'Connected via OAuth with repository read access.'}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="text-sm font-semibold text-gray-900">Last analyzed</div>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                {profileState.last_analyzed_at
                  ? new Date(profileState.last_analyzed_at).toLocaleString()
                  : 'No completed analysis yet.'}
              </p>
            </div>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="mb-5 text-xl font-bold text-gray-900">Profile Visibility</h2>
          <div className="space-y-4">
            <SettingsToggle
              checked={isPublic}
              onChange={setIsPublic}
              title="Appear in recruiter search"
              description="Allow recruiters to discover your profile."
            />
            <SettingsToggle
              checked={showConfidence}
              onChange={setShowConfidence}
              title="Show confidence scores publicly"
              description="Recruiters will see your skill confidence percentages."
            />
          </div>
          <button
            onClick={saveVisibility}
            disabled={savingVisibility}
            className="btn-primary mt-5"
          >
            {savingVisibility ? 'Saving...' : 'Save Settings'}
          </button>
        </section>

        <section className="surface p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Deployment readiness</h2>
              <p className="mt-1 text-sm leading-6 text-gray-600">
                This status reports whether the current environment is ready for customer-facing operation.
              </p>
            </div>
            <div className="rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white">{readinessScore}% ready</div>
          </div>

          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-gray-900">Active mode</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">{mode === 'demo' ? 'Sandbox' : 'Live Supabase'}</div>
              <div className="mt-2 text-sm text-gray-600">
                {mode === 'demo'
                  ? 'The workspace is using sandbox-safe data.'
                  : 'Live backend mode is active for this session.'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-sm font-semibold text-gray-900">Commercial tier</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {getPlanDefinition(subscription?.plan_key || 'starter').name}
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {recruiterLists.length} shortlist{recruiterLists.length === 1 ? '' : 's'} configured in the buyer workspace.
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {readinessChecks.map((check) => (
              <div key={check.id} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <div className="font-semibold text-gray-900">{check.label}</div>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{check.detail}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                    check.status === 'pass'
                      ? 'bg-emerald-50 text-emerald-700'
                      : check.status === 'warn'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="mb-5 text-xl font-bold text-gray-900">Public Profile</h2>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-2 text-sm font-semibold text-gray-900">Your public profile URL</div>
            <div className="break-all text-sm leading-6 text-gray-600">{publicProfileUrl}</div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={copyProfileUrl}
                className="btn-secondary"
              >
                <Copy className="h-4 w-4" />
                Copy URL
              </button>
              <a
                href={publicProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                Open public profile
              </a>
            </div>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="mb-5 text-xl font-bold text-gray-900">Data Management</h2>
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-1 flex items-center gap-2 text-gray-900">
                <Trash2 className="h-4 w-4 text-gray-500" />
                <span className="font-semibold">Delete Analysis Data</span>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                Removes repositories, inferred skills, evidence, and repository analysis while keeping your account.
              </p>
              <button
                onClick={() => setShowDeleteAnalysisModal(true)}
                className="btn-secondary mt-4"
              >
                Delete Analysis Data
              </button>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="mb-1 flex items-center gap-2 text-red-900">
                <ShieldAlert className="h-4 w-4" />
                <span className="font-semibold">Delete Account</span>
              </div>
              <p className="text-sm leading-6 text-red-800">
                Permanently deletes your profile, analysis data, and authentication account.
              </p>
              <button
                onClick={() => setShowDeleteAccountModal(true)}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete Account
              </button>
            </div>
          </div>
        </section>

        <section className="surface p-6">
          <h2 className="mb-4 text-xl font-bold text-gray-900">Session</h2>
          <button
            onClick={handleSignOut}
            className="btn-secondary"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </section>
      </div>

      {showDeleteAnalysisModal && (
        <ConfirmationModal
          title="Delete analysis data?"
          description="This removes repositories, inferred skills, evidence, and analysis summaries. Your profile and login remain available."
          confirmLabel={deleting ? 'Deleting...' : 'Delete analysis data'}
          onCancel={() => setShowDeleteAnalysisModal(false)}
          onConfirm={handleDeleteAnalysis}
          confirmDisabled={deleting}
        />
      )}

      {showDeleteAccountModal && (
        <ConfirmationModal
          title="Delete account permanently?"
          description={`Type your GitHub username (${profileState.github_id}) to confirm permanent deletion.`}
          confirmLabel={deleting ? 'Deleting...' : 'Delete account'}
          onCancel={() => {
            setShowDeleteAccountModal(false);
            setAccountConfirmation('');
          }}
          onConfirm={handleDeleteAccount}
          confirmDisabled={!canDeleteAccount || deleting}
        >
          <input
            value={accountConfirmation}
            onChange={(event) => setAccountConfirmation(event.target.value)}
            className="mt-5 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-400 focus:bg-white focus:ring-4 focus:ring-red-100"
            placeholder={`Type ${profileState.github_id}`}
          />
        </ConfirmationModal>
      )}
    </div>
  );
}
