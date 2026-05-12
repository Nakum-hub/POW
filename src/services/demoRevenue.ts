import { getDefaultSubscription } from '../lib/plans';
import type {
  DeveloperSearchResult,
  PipelineDeveloperProfile,
  PlanKey,
  RecruiterList,
  RecruiterListCandidate,
  Subscription,
} from '../types';
import { DEMO_USER_ID, fetchDemoTopRepositories, searchDemoDevelopers } from './demo';

const DEMO_SUBSCRIPTION_KEY = 'skillos.demo.subscription.v1';
const DEMO_LISTS_KEY = 'skillos.demo.recruiter-lists.v1';
const DEMO_CANDIDATES_KEY = 'skillos.demo.recruiter-list-candidates.v1';

const baseSubscription: Subscription = {
  id: 'demo-subscription-growth',
  user_id: DEMO_USER_ID,
  plan_key: 'growth',
  status: 'active',
  seats: 3,
  monthly_price: 349,
  monthly_value_target: 12000,
  current_period_end: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
  notes: 'Growth plan unlocked for the evaluation workspace.',
  created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};

const baseLists: RecruiterList[] = [
  {
    id: 'demo-list-founding-engineering',
    owner_id: DEMO_USER_ID,
    name: 'Founding Engineering',
    description: 'Hands-on builders for first ten technical hires.',
    candidate_count: 2,
    created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-list-platform-depth',
    owner_id: DEMO_USER_ID,
    name: 'Platform Depth',
    description: 'Candidates with systems and reliability signal.',
    candidate_count: 1,
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const baseCandidates: RecruiterListCandidate[] = [
  {
    id: 'demo-candidate-1',
    list_id: 'demo-list-founding-engineering',
    developer_user_id: 'demo-user-2',
    stage: 'screen',
    fit_score: 88,
    notes: 'Strong product instincts and clear Next.js depth. Good fit for first frontend platform hire.',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-candidate-2',
    list_id: 'demo-list-founding-engineering',
    developer_user_id: 'demo-user-4',
    stage: 'outreach',
    fit_score: 82,
    notes: 'Data and GraphQL experience. Evaluate appetite for startup ambiguity.',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'demo-candidate-3',
    list_id: 'demo-list-platform-depth',
    developer_user_id: 'demo-user-3',
    stage: 'interview',
    fit_score: 91,
    notes: 'Infra and security profile is unusually strong. Keep warm for backend leadership scope.',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') {
    return cloneValue(fallback);
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return cloneValue(fallback);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return cloneValue(fallback);
  }
}

function writeLocalStorage<T>(key: string, value: T) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function readSubscription(userId: string) {
  const stored = readLocalStorage<Record<string, Subscription>>(DEMO_SUBSCRIPTION_KEY, {
    [DEMO_USER_ID]: baseSubscription,
  });

  return stored[userId] || getDefaultSubscription(userId);
}

function writeSubscription(subscription: Subscription) {
  const stored = readLocalStorage<Record<string, Subscription>>(DEMO_SUBSCRIPTION_KEY, {
    [DEMO_USER_ID]: baseSubscription,
  });

  writeLocalStorage(DEMO_SUBSCRIPTION_KEY, {
    ...stored,
    [subscription.user_id]: subscription,
  });
}

function readLists(userId: string) {
  return readLocalStorage<RecruiterList[]>(DEMO_LISTS_KEY, baseLists).filter((list) => list.owner_id === userId);
}

function writeLists(lists: RecruiterList[]) {
  writeLocalStorage(DEMO_LISTS_KEY, lists);
}

function readCandidates() {
  return readLocalStorage<RecruiterListCandidate[]>(DEMO_CANDIDATES_KEY, baseCandidates);
}

function writeCandidates(candidates: RecruiterListCandidate[]) {
  writeLocalStorage(DEMO_CANDIDATES_KEY, candidates);
}

async function buildDeveloperLookup() {
  const developers = await searchDemoDevelopers('', 0, 'all');
  const lookup = new Map<string, PipelineDeveloperProfile>();

  await Promise.all(
    developers.map(async (developer) => {
      const topRepositories = await fetchDemoTopRepositories(developer.user_id, 3);
      lookup.set(developer.user_id, {
        ...developer,
        top_repositories: topRepositories,
      });
    })
  );

  return lookup;
}

function withCounts(lists: RecruiterList[], candidates: RecruiterListCandidate[]) {
  return lists
    .map((list) => ({
      ...list,
      candidate_count: candidates.filter((candidate) => candidate.list_id === list.id).length,
    }))
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export async function fetchDemoCurrentSubscription(userId: string) {
  return readSubscription(userId);
}

export async function updateDemoSubscriptionPlan(userId: string, planKey: PlanKey) {
  const current = readSubscription(userId);
  const next = {
    ...current,
    plan_key: planKey,
    updated_at: new Date().toISOString(),
  };

  writeSubscription(next);
  return next;
}

export async function fetchDemoRecruiterLists(userId: string) {
  const lists = readLists(userId);
  return withCounts(lists, readCandidates());
}

export async function createDemoRecruiterList(userId: string, name: string, description: string) {
  const nextList: RecruiterList = {
    id: `demo-list-${crypto.randomUUID()}`,
    owner_id: userId,
    name,
    description,
    candidate_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const allLists = readLocalStorage<RecruiterList[]>(DEMO_LISTS_KEY, baseLists);
  writeLists([nextList, ...allLists]);
  return nextList;
}

export async function fetchDemoRecruiterListCandidates(userId: string, listId: string) {
  const lists = readLists(userId);
  if (!lists.some((list) => list.id === listId)) {
    return [];
  }

  const lookup = await buildDeveloperLookup();

  return readCandidates()
    .filter((candidate) => candidate.list_id === listId)
    .map((candidate) => ({
      ...candidate,
      developer: lookup.get(candidate.developer_user_id),
    }))
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export async function saveDemoDeveloperToList(userId: string, listId: string, developer: DeveloperSearchResult) {
  const lists = readLists(userId);
  if (!lists.some((list) => list.id === listId)) {
    throw new Error('Recruiter list not found.');
  }

  const existing = readCandidates();
  if (existing.some((candidate) => candidate.list_id === listId && candidate.developer_user_id === developer.user_id)) {
    return existing.find((candidate) => candidate.list_id === listId && candidate.developer_user_id === developer.user_id)!;
  }

  const nextCandidate: RecruiterListCandidate = {
    id: `demo-candidate-${crypto.randomUUID()}`,
    list_id: listId,
    developer_user_id: developer.user_id,
    stage: 'new',
    fit_score: Math.round(
      developer.skills.slice(0, 3).reduce((sum, skill) => sum + skill.confidence, 0) /
        Math.max(1, Math.min(3, developer.skills.length))
    ),
    notes: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const nextCandidates = [nextCandidate, ...existing];
  writeCandidates(nextCandidates);

  const allLists = readLocalStorage<RecruiterList[]>(DEMO_LISTS_KEY, baseLists).map((list) =>
    list.id === listId
      ? {
          ...list,
          updated_at: new Date().toISOString(),
        }
      : list
  );
  writeLists(allLists);

  return nextCandidate;
}

export async function updateDemoRecruiterListCandidate(
  userId: string,
  candidateId: string,
  updates: Pick<RecruiterListCandidate, 'stage' | 'fit_score' | 'notes'>
) {
  const lists = readLists(userId);
  const allowedListIds = new Set(lists.map((list) => list.id));
  const candidates = readCandidates();

  const nextCandidates = candidates.map((candidate) =>
    candidate.id === candidateId && allowedListIds.has(candidate.list_id)
      ? {
          ...candidate,
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : candidate
  );

  writeCandidates(nextCandidates);
  return nextCandidates.find((candidate) => candidate.id === candidateId) || null;
}

export async function removeDemoRecruiterListCandidate(userId: string, candidateId: string) {
  const lists = readLists(userId);
  const allowedListIds = new Set(lists.map((list) => list.id));
  const candidates = readCandidates();
  const removed = candidates.find((candidate) => candidate.id === candidateId && allowedListIds.has(candidate.list_id));

  if (!removed) {
    return;
  }

  writeCandidates(candidates.filter((candidate) => candidate.id !== candidateId));

  const allLists = readLocalStorage<RecruiterList[]>(DEMO_LISTS_KEY, baseLists).map((list) =>
    list.id === removed.list_id
      ? {
          ...list,
          updated_at: new Date().toISOString(),
        }
      : list
  );
  writeLists(allLists);
}
