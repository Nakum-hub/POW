import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { normalizeSubscription } from '../lib/plans';
import type { RecruiterList, Subscription } from '../types';
import { useAuth } from './AuthContext';
import { createRecruiterList, fetchCurrentSubscription, fetchRecruiterLists } from '../services/revenue';

interface RevenueContextType {
  subscription: Subscription | null;
  recruiterLists: RecruiterList[];
  loading: boolean;
  refreshRevenue: () => Promise<void>;
  createList: (name: string, description: string) => Promise<RecruiterList>;
}

const RevenueContext = createContext<RevenueContextType | undefined>(undefined);

export function RevenueProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [recruiterLists, setRecruiterLists] = useState<RecruiterList[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshRevenue = useCallback(async () => {
    if (!profile) {
      setSubscription(null);
      setRecruiterLists([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [nextSubscription, nextLists] = await Promise.all([
        fetchCurrentSubscription(profile.id),
        fetchRecruiterLists(profile.id),
      ]);

      setSubscription(normalizeSubscription(nextSubscription, profile.id));
      setRecruiterLists(nextLists);
    } catch {
      setSubscription(normalizeSubscription(null, profile.id));
      setRecruiterLists([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refreshRevenue();
  }, [refreshRevenue]);

  const createList = useCallback(
    async (name: string, description: string) => {
      if (!profile) {
        throw new Error('Authentication required');
      }

      const nextList = await createRecruiterList(profile.id, name, description);
      setRecruiterLists((current) => [nextList, ...current]);
      return nextList;
    },
    [profile]
  );

  const value = useMemo(
    () => ({
      subscription,
      recruiterLists,
      loading,
      refreshRevenue,
      createList,
    }),
    [subscription, recruiterLists, loading, refreshRevenue, createList]
  );

  return <RevenueContext.Provider value={value}>{children}</RevenueContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRevenue() {
  const context = useContext(RevenueContext);

  if (!context) {
    throw new Error('useRevenue must be used within a RevenueProvider');
  }

  return context;
}
