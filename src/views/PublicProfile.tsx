import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, ExternalLink, GitBranch, ShieldCheck, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Profile, Repository, SkillCategory, UserSkill } from '../types';
import { publicSkillCategoryOrder, skillCategoryMeta } from '../lib/skills';
import { avatarPlaceholder } from '../lib/placeholders';
import { fetchPublicProfileByGithubId } from '../services/api';

type PublicSkillRow = UserSkill & {
  skill?: {
    id: string;
    name: string;
    category: SkillCategory;
    created_at: string;
  };
};

export default function PublicProfile() {
  const { loading: authLoading } = useAuth();
  const { githubId } = useParams<{ githubId: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [skills, setSkills] = useState<PublicSkillRow[]>([]);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [repoCount, setRepoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useDocumentTitle(profile ? `SkillOS - ${profile.name}` : githubId ? `SkillOS - ${githubId}` : 'SkillOS - Public Profile');

  const loadProfile = useCallback(async () => {
    if (!githubId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setNotFound(false);

      const publicProfile = await fetchPublicProfileByGithubId(githubId);

      if (!publicProfile) {
        setProfile(null);
        setSkills([]);
        setRepos([]);
        setRepoCount(0);
        setNotFound(true);
        return;
      }

      setProfile(publicProfile.profile);
      setSkills(publicProfile.skills as PublicSkillRow[]);
      setRepos(publicProfile.repos);
      setRepoCount(publicProfile.repoCount);
    } catch {
      setProfile(null);
      setSkills([]);
      setRepos([]);
      setRepoCount(0);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [githubId]);

  useEffect(() => {
    if (!authLoading) {
      void loadProfile();
    }
  }, [authLoading, loadProfile]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] px-5 py-10 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-6xl animate-pulse rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-5">
            <div className="h-24 w-24 rounded-2xl bg-slate-200" />
            <div className="space-y-3">
              <div className="h-6 w-48 rounded bg-slate-200" />
              <div className="h-4 w-32 rounded bg-slate-200" />
            </div>
          </div>
          <div className="mb-6 h-40 rounded-2xl bg-slate-200" />
          <div className="h-56 rounded-2xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] px-5 py-10 sm:px-7 lg:px-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-950">Profile unavailable</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600">
            This developer profile is private or does not exist.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/search" className="btn-primary">
              Search developers
            </Link>
            <Link to="/login" className="btn-secondary">
              Claim profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--app-bg)]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-7 lg:px-10">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-slate-950">SkillOS</div>
              <div className="text-xs text-slate-500">Verified developer profile</div>
            </div>
          </Link>
          <div className="flex gap-2">
            <Link to="/search" className="btn-secondary hidden sm:inline-flex">
              Search talent
            </Link>
            <Link to="/login" className="btn-primary">
              Claim profile
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8 sm:px-7 lg:px-10">
        <section className="surface p-6 sm:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-5">
              <img
                src={profile.avatar_url || avatarPlaceholder}
                alt={profile.name}
                className="h-24 w-24 rounded-2xl object-cover"
              />
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Verified via GitHub
                </div>
                <h1 className="text-4xl font-semibold text-slate-950">{profile.name}</h1>
                <p className="mt-2 text-lg text-slate-500">@{profile.github_id}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href={`https://github.com/${profile.github_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary"
                  >
                    View GitHub
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Metric label="Skills detected" value={skills.length.toString()} />
              <Metric label="Top repositories" value={repoCount.toString()} />
            </div>
          </div>
        </section>

        <section className="surface p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-950">Skills by category</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Confidence is inferred from public repositories, stack signals, and project evidence.
            </p>
          </div>

          <div className="space-y-8">
            {publicSkillCategoryOrder
              .filter((category) => skills.some((skill) => skill.skill?.category === category))
              .map((category) => (
                <div key={category}>
                  <div className="mb-3 flex items-center gap-3">
                    <div className={`h-2.5 w-2.5 rounded-full ${skillCategoryMeta[category].dotClass}`} />
                    <h3 className="text-lg font-semibold text-slate-950">{skillCategoryMeta[category].label}</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {skills
                      .filter((skill) => skill.skill?.category === category)
                      .map((skill) => (
                        <div key={skill.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-950">{skill.skill?.name}</span>
                            {skill.confidence >= 70 && <CheckCircle className="h-5 w-5 text-emerald-500" />}
                          </div>
                          {profile.show_confidence ? (
                            <>
                              <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className={`h-full rounded-full ${skillCategoryMeta[category].dotClass}`}
                                  style={{ width: `${skill.confidence}%` }}
                                />
                              </div>
                              <div className="text-sm font-semibold text-slate-600">{skill.confidence}% confidence</div>
                            </>
                          ) : (
                            <div className="text-sm text-slate-500">Confidence hidden by developer.</div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        </section>

        <section className="surface p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-slate-950">Top repositories</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Repository quality is computed from activity, tests, README coverage, and project ownership signals.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {repos.map((repo) => (
              <a
                key={repo.id}
                href={`https://github.com/${repo.full_name}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-slate-300 hover:bg-white hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-950">{repo.name}</div>
                    <div className="mt-1 text-sm text-slate-500">{repo.language || 'Unknown language'}</div>
                  </div>
                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-slate-400" />
                </div>
                <p className="mb-5 text-sm leading-6 text-slate-600">
                  {repo.description || 'No repository description available.'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="h-4 w-4" />
                    {repo.stars}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <GitBranch className="h-4 w-4" />
                    {repo.forks}
                  </span>
                  <span className="font-semibold text-emerald-700">{Math.round(repo.quality_score * 100)}% quality</span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="surface flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-slate-950">Build a verified developer profile.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              SkillOS converts public GitHub work into a profile recruiters can search, review, and share.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/login" className="btn-primary">
              Is this you? Claim your profile
            </Link>
            <Link to="/search" className="btn-secondary">
              Looking to hire? Search developers
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
