import { getBackendMode } from '../lib/backend';
import { getDefaultSubscription, normalizeSubscription } from '../lib/plans';
import { supabase } from '../lib/supabase';
import type {
  DeveloperSearchResult,
  PipelineDeveloperProfile,
  RecruiterList,
  RecruiterListCandidate,
  SkillCategory,
  Subscription,
} from '../types';
import {
  createDemoRecruiterList,
  fetchDemoCurrentSubscription,
  fetchDemoRecruiterListCandidates,
  fetchDemoRecruiterLists,
  removeDemoRecruiterListCandidate,
  saveDemoDeveloperToList,
  updateDemoRecruiterListCandidate,
  updateDemoSubscriptionPlan,
} from './demoRevenue';

type SkillRow = {
  user_id: string;
  confidence: number;
  skill: { name: string; category: SkillCategory } | { name: string; category: SkillCategory }[] | null;
};

type RepositorySummaryRow = {
  user_id: string;
  name: string;
  stars: number;
  language: string;
  quality_score: number;
};

async function syncRecruiterListCount(listId: string) {
  const { count, error: countError } = await supabase
    .from('recruiter_list_candidates')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId);

  if (countError) {
    throw countError;
  }

  const { error } = await supabase
    .from('recruiter_lists')
    .update({
      candidate_count: count || 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', listId);

  if (error) {
    throw error;
  }
}

async function ensureRecruiterOwnsList(userId: string, listId: string) {
  const { data, error } = await supabase
    .from('recruiter_lists')
    .select('id')
    .eq('id', listId)
    .eq('owner_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Recruiter list not found.');
  }
}

export async function fetchCurrentSubscription(userId: string) {
  if (getBackendMode() === 'demo') {
    return normalizeSubscription(await fetchDemoCurrentSubscription(userId), userId);
  }

  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return normalizeSubscription((data as Subscription | null) || getDefaultSubscription(userId), userId);
}

export async function changeWorkspaceSubscriptionPlan(userId: string, planKey: Subscription['plan_key']) {
  if (getBackendMode() !== 'demo') {
    throw new Error('Live plan changes should be managed through billing ops.');
  }

  return normalizeSubscription(await updateDemoSubscriptionPlan(userId, planKey), userId);
}

export async function fetchRecruiterLists(userId: string) {
  if (getBackendMode() === 'demo') {
    return fetchDemoRecruiterLists(userId);
  }

  const { data, error } = await supabase
    .from('recruiter_lists')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data || []) as RecruiterList[];
}

export async function createRecruiterList(userId: string, name: string, description: string) {
  if (getBackendMode() === 'demo') {
    return createDemoRecruiterList(userId, name, description);
  }

  const { data, error } = await supabase
    .from('recruiter_lists')
    .insert([
      {
        owner_id: userId,
        name,
        description,
        candidate_count: 0,
      },
    ])
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RecruiterList;
}

export async function fetchRecruiterListCandidates(userId: string, listId: string) {
  if (getBackendMode() === 'demo') {
    return fetchDemoRecruiterListCandidates(userId, listId);
  }

  await ensureRecruiterOwnsList(userId, listId);

  const { data: candidateRows, error: candidateError } = await supabase
    .from('recruiter_list_candidates')
    .select('*')
    .eq('list_id', listId)
    .order('updated_at', { ascending: false });

  if (candidateError) {
    throw candidateError;
  }

  const candidates = (candidateRows || []) as RecruiterListCandidate[];
  if (!candidates.length) {
    return [];
  }

  const developerIds = [...new Set(candidates.map((candidate) => candidate.developer_user_id))];

  const [{ data: profileRows, error: profileError }, { data: skillRows, error: skillError }, { data: repoRows, error: repoError }] =
    await Promise.all([
      supabase.from('profiles').select('id, github_id, name, avatar_url, show_confidence').in('id', developerIds),
      supabase
        .from('user_skills')
        .select('user_id, confidence, skill:skills(name, category)')
        .in('user_id', developerIds)
        .order('confidence', { ascending: false }),
      supabase
        .from('repositories')
        .select('user_id, name, stars, language, quality_score')
        .in('user_id', developerIds)
        .order('quality_score', { ascending: false }),
    ]);

  if (profileError) {
    throw profileError;
  }
  if (skillError) {
    throw skillError;
  }
  if (repoError) {
    throw repoError;
  }

  const profileMap = new Map(
    ((profileRows || []) as Array<{
      id: string;
      github_id: string;
      name: string;
      avatar_url: string;
      show_confidence: boolean;
    }>).map((profile) => [profile.id, profile])
  );

  const skillsByUser = new Map<string, PipelineDeveloperProfile['skills']>();
  ((skillRows || []) as SkillRow[]).forEach((row) => {
    const skill = Array.isArray(row.skill) ? row.skill[0] : row.skill;
    if (!skill) {
      return;
    }

    const current = skillsByUser.get(row.user_id) || [];
    if (current.length < 5) {
      current.push({
        name: skill.name,
        category: skill.category,
        confidence: row.confidence,
      });
      skillsByUser.set(row.user_id, current);
    }
  });

  const repositoriesByUser = new Map<string, PipelineDeveloperProfile['top_repositories']>();
  ((repoRows || []) as RepositorySummaryRow[]).forEach((row) => {
    const current = repositoriesByUser.get(row.user_id) || [];
    if (current.length < 3) {
      current.push({
        name: row.name,
        stars: row.stars,
        language: row.language,
        quality_score: row.quality_score,
      });
      repositoriesByUser.set(row.user_id, current);
    }
  });

  return candidates.map((candidate) => {
    const profile = profileMap.get(candidate.developer_user_id);
    const developer: PipelineDeveloperProfile | undefined = profile
      ? {
          user_id: candidate.developer_user_id,
          github_id: profile.github_id,
          name: profile.name,
          avatar_url: profile.avatar_url,
          show_confidence: profile.show_confidence,
          skills: skillsByUser.get(candidate.developer_user_id) || [],
          top_repositories: repositoriesByUser.get(candidate.developer_user_id) || [],
        }
      : undefined;

    return {
      ...candidate,
      developer,
    };
  });
}

export async function saveDeveloperToRecruiterList(userId: string, listId: string, developer: DeveloperSearchResult) {
  if (getBackendMode() === 'demo') {
    return saveDemoDeveloperToList(userId, listId, developer);
  }

  await ensureRecruiterOwnsList(userId, listId);

  const fitScore = Math.round(
    developer.skills.slice(0, 3).reduce((sum, skill) => sum + skill.confidence, 0) /
      Math.max(1, Math.min(3, developer.skills.length))
  );

  const { data, error } = await supabase
    .from('recruiter_list_candidates')
    .upsert(
      [
        {
          list_id: listId,
          developer_user_id: developer.user_id,
          stage: 'new',
          fit_score: fitScore,
          notes: '',
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: 'list_id,developer_user_id' }
    )
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await syncRecruiterListCount(listId);
  return data as RecruiterListCandidate;
}

export async function updateRecruiterListCandidate(
  userId: string,
  candidateId: string,
  updates: Pick<RecruiterListCandidate, 'stage' | 'fit_score' | 'notes'>
) {
  if (getBackendMode() === 'demo') {
    return updateDemoRecruiterListCandidate(userId, candidateId, updates);
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('recruiter_list_candidates')
    .select('id, list_id')
    .eq('id', candidateId)
    .maybeSingle();

  if (candidateError) {
    throw candidateError;
  }

  if (!candidate) {
    throw new Error('Candidate not found.');
  }

  await ensureRecruiterOwnsList(userId, candidate.list_id);

  const { data, error } = await supabase
    .from('recruiter_list_candidates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', candidateId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data as RecruiterListCandidate;
}

export async function removeRecruiterListCandidate(userId: string, candidateId: string) {
  if (getBackendMode() === 'demo') {
    return removeDemoRecruiterListCandidate(userId, candidateId);
  }

  const { data: candidate, error: candidateError } = await supabase
    .from('recruiter_list_candidates')
    .select('id, list_id')
    .eq('id', candidateId)
    .maybeSingle();

  if (candidateError) {
    throw candidateError;
  }

  if (!candidate) {
    return;
  }

  await ensureRecruiterOwnsList(userId, candidate.list_id);

  const { error } = await supabase.from('recruiter_list_candidates').delete().eq('id', candidateId);

  if (error) {
    throw error;
  }

  await syncRecruiterListCount(candidate.list_id);
}
