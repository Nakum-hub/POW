import { getBackendMode } from '../lib/backend';
import { supabase, supabaseUrl } from '../lib/supabase';
import type {
  Profile,
  RepoAnalysis,
  Repository,
  Skill,
  SkillCategory,
  SkillEvidence,
  UserSkill,
} from '../types';
import {
  analyzeDemoRepositories,
  DEMO_USER_ID,
  deleteDemoAccount,
  deleteDemoAnalysis,
  fetchDemoPublicProfile,
  fetchDemoRepoAnalysis,
  fetchDemoSkillEvidence,
  fetchDemoTopRepositories,
  fetchDemoUserRepositories,
  fetchDemoUserSkills,
  generateDemoExplanation,
  getDemoProfile,
  searchDemoDevelopers,
  updateDemoProfileVisibility,
  type DeveloperSearchResult,
  type PublicProfilePayload,
} from './demo';

export type SearchCategory = 'all' | SkillCategory;

export async function fetchUserProfile(userId: string): Promise<Profile | null> {
  if (getBackendMode() === 'demo') {
    return getDemoProfile(userId);
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchUserRepositories(userId: string): Promise<Repository[]> {
  if (getBackendMode() === 'demo') {
    return fetchDemoUserRepositories(userId);
  }

  const { data, error } = await supabase
    .from('repositories')
    .select('*')
    .eq('user_id', userId)
    .order('stars', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchUserSkills(userId: string): Promise<UserSkill[]> {
  if (getBackendMode() === 'demo') {
    return fetchDemoUserSkills(userId);
  }

  const { data, error } = await supabase
    .from('user_skills')
    .select(`
      *,
      skill:skills(*),
      evidence:skill_evidence(repo_id, score)
    `)
    .eq('user_id', userId)
    .order('confidence', { ascending: false });

  if (error) throw error;
  return (data || []) as UserSkill[];
}

export async function fetchSkillEvidence(userSkillId: string): Promise<SkillEvidence[]> {
  if (getBackendMode() === 'demo') {
    return fetchDemoSkillEvidence(userSkillId);
  }

  const { data, error } = await supabase
    .from('skill_evidence')
    .select(`
      *,
      repo:repositories(*)
    `)
    .eq('user_skill_id', userSkillId)
    .order('score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchRepoAnalysis(repoId: string): Promise<RepoAnalysis | null> {
  if (getBackendMode() === 'demo') {
    return fetchDemoRepoAnalysis(repoId);
  }

  const { data, error } = await supabase.from('repo_analysis').select('*').eq('repo_id', repoId).maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchAllSkills(): Promise<Skill[]> {
  if (getBackendMode() === 'demo') {
    const demoSkills = await fetchDemoUserSkills(DEMO_USER_ID);
    return demoSkills
      .map((skill) => skill.skill)
      .filter((skill): skill is Skill => Boolean(skill))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  const { data, error } = await supabase.from('skills').select('*').order('name');

  if (error) throw error;
  return data || [];
}

export async function deleteUserData(userId: string): Promise<void> {
  if (getBackendMode() === 'demo') {
    await deleteDemoAccount(userId);
    return;
  }

  const { error } = await supabase.from('profiles').delete().eq('id', userId);

  if (error) throw error;
}

export async function deleteAnalysisOnly(userId: string): Promise<void> {
  if (getBackendMode() === 'demo') {
    await deleteDemoAnalysis(userId);
    return;
  }

  const { error: repoError } = await supabase.from('repositories').delete().eq('user_id', userId);
  if (repoError) throw repoError;

  const { error: skillsError } = await supabase.from('user_skills').delete().eq('user_id', userId);
  if (skillsError) throw skillsError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ last_analyzed_at: null })
    .eq('id', userId);
  if (profileError) throw profileError;
}

export async function updateProfileVisibility(
  userId: string,
  updates: Pick<Profile, 'is_public' | 'show_confidence'>
): Promise<Profile | null> {
  if (getBackendMode() === 'demo') {
    return updateDemoProfileVisibility(userId, updates);
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function analyzeRepositories(
  sessionToken: string,
  githubToken: string,
  onProgress?: (progress: number, stage: string) => void
): Promise<{ repos_analyzed: number; skills_detected: number }> {
  if (getBackendMode() === 'demo') {
    return analyzeDemoRepositories(DEMO_USER_ID, onProgress);
  }

  const apiUrl = `${supabaseUrl}/functions/v1/analyze-repos`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ github_token: githubToken }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Analysis failed');
  }

  if (!response.body) {
    throw new Error('Analysis stream unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: { repos_analyzed: number; skills_detected: number } | null = null;

  const processBuffer = () => {
    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const event of events) {
      const line = event
        .split('\n')
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith('data:'));

      if (!line) continue;

      const json = line.slice(5).trim();
      if (!json) continue;

      const payload = JSON.parse(json) as {
        progress?: number;
        stage?: string;
        done?: boolean;
        repos_analyzed?: number;
        skills_detected?: number;
        error?: string;
      };

      if (payload.error) {
        throw new Error(payload.error);
      }

      if (typeof payload.progress === 'number' && typeof payload.stage === 'string') {
        onProgress?.(payload.progress, payload.stage);
      }

      if (payload.done) {
        result = {
          repos_analyzed: payload.repos_analyzed ?? 0,
          skills_detected: payload.skills_detected ?? 0,
        };
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    processBuffer();

    if (result) {
      await reader.cancel();
      return result;
    }
  }

  buffer += decoder.decode();
  processBuffer();

  if (result) {
    return result;
  }

  throw new Error('Analysis stream ended unexpectedly');
}

export async function searchDeveloperProfiles(
  query: string,
  minConfidence: number,
  category: SearchCategory
): Promise<DeveloperSearchResult[]> {
  if (getBackendMode() === 'demo') {
    return searchDemoDevelopers(query, minConfidence, category);
  }

  type SearchRow = {
    user_id: string;
    confidence: number;
    skills: { name: string; category: SkillCategory } | { name: string; category: SkillCategory }[] | null;
    profiles:
      | { github_id: string; name: string; avatar_url: string; is_public: boolean; show_confidence: boolean }
      | Array<{ github_id: string; name: string; avatar_url: string; is_public: boolean; show_confidence: boolean }>
      | null;
  };

  let searchQuery = supabase
    .from('user_skills')
    .select(`
      user_id,
      confidence,
      skills!inner(name, category),
      profiles!user_skills_user_id_fkey!inner(
        github_id, name, avatar_url, is_public, show_confidence
      )
    `)
    .gte('confidence', minConfidence)
    .eq('profiles.is_public', true);

  if (query) {
    searchQuery = searchQuery.ilike('skills.name', `%${query}%`);
  }

  if (category !== 'all') {
    searchQuery = searchQuery.eq('skills.category', category);
  }

  const { data, error } = await searchQuery.order('confidence', { ascending: false }).limit(100);
  if (error) throw error;

  const devMap = new Map<string, DeveloperSearchResult>();

  for (const row of (data || []) as SearchRow[]) {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const skill = Array.isArray(row.skills) ? row.skills[0] : row.skills;
    if (!profile?.is_public || !skill) continue;

    if (!devMap.has(row.user_id)) {
      devMap.set(row.user_id, {
        user_id: row.user_id,
        github_id: profile.github_id,
        name: profile.name,
        avatar_url: profile.avatar_url,
        show_confidence: profile.show_confidence,
        skills: [],
      });
    }

    devMap.get(row.user_id)?.skills.push({
      name: skill.name,
      category: skill.category,
      confidence: row.confidence,
    });
  }

  return Array.from(devMap.values()).map((developer) => ({
    ...developer,
    skills: developer.skills.sort((left, right) => right.confidence - left.confidence),
  }));
}

export async function fetchDeveloperTopRepositories(userId: string, limit = 3) {
  if (getBackendMode() === 'demo') {
    return fetchDemoTopRepositories(userId, limit);
  }

  const { data, error } = await supabase
    .from('repositories')
    .select('name, stars, language, quality_score')
    .eq('user_id', userId)
    .order('quality_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (
    data || []
  ) as Array<{ name: string; stars: number; language: string; quality_score: number }>;
}

export async function fetchPublicProfileByGithubId(githubId: string): Promise<PublicProfilePayload | null> {
  if (getBackendMode() === 'demo') {
    return fetchDemoPublicProfile(githubId);
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .ilike('github_id', githubId)
    .eq('is_public', true)
    .maybeSingle();

  if (!profileData) {
    return null;
  }

  const [skillsData, reposData, repoCountData] = await Promise.all([
    supabase
      .from('user_skills')
      .select('*, skill:skills(*)')
      .eq('user_id', profileData.id)
      .order('confidence', { ascending: false }),
    supabase.from('repositories').select('*').eq('user_id', profileData.id).order('stars', { ascending: false }).limit(6),
    supabase.from('repositories').select('id', { count: 'exact', head: true }).eq('user_id', profileData.id),
  ]);

  return {
    profile: profileData as Profile,
    skills: (skillsData.data || []) as UserSkill[],
    repos: (reposData.data || []) as Repository[],
    repoCount: repoCountData.count || (reposData.data || []).length,
  };
}

export async function generateProjectExplanation(
  repoId: string,
  audience: 'hr' | 'technical',
  sessionToken?: string
): Promise<{ explanation: string }> {
  if (getBackendMode() === 'demo') {
    return { explanation: generateDemoExplanation(repoId, audience) };
  }

  if (!sessionToken) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/explain-repo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ repo_id: repoId, audience }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate explanation');
  }

  return response.json() as Promise<{ explanation: string }>;
}

export async function deleteAccount(sessionToken: string, userId: string): Promise<void> {
  if (getBackendMode() === 'demo') {
    await deleteDemoAccount(userId);
    return;
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${sessionToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete account');
  }
}
