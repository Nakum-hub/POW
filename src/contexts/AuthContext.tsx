import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { detectBackendMode, getBackendMessage, getBackendMode, type BackendMode } from '../lib/backend';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { getDemoCurrentProfile, isDemoSignedIn, setDemoSignedIn } from '../services/demo';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  mode: BackendMode;
  modeMessage: string | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<BackendMode>(getBackendMode());
  const [modeMessage, setModeMessage] = useState<string | null>(getBackendMessage());

  const buildDemoUser = useCallback((demoProfile: Profile): User => {
    return {
      id: demoProfile.id,
      app_metadata: { provider: 'github', providers: ['github'] },
      user_metadata: {
        avatar_url: demoProfile.avatar_url,
        full_name: demoProfile.name,
        name: demoProfile.name,
        preferred_username: demoProfile.github_id,
        user_name: demoProfile.github_id,
      },
      aud: 'authenticated',
      created_at: demoProfile.created_at,
      updated_at: demoProfile.updated_at,
      role: 'authenticated',
    } as User;
  }, []);

  const buildDemoSession = useCallback(
    (demoUser: User): Session =>
      ({
        access_token: 'demo-access-token',
        refresh_token: 'demo-refresh-token',
        expires_in: 60 * 60 * 24,
        token_type: 'bearer',
        provider_token: 'demo-provider-token',
        user: demoUser,
      }) as Session,
    []
  );

  const loadProfile = useCallback(
    async (userId: string, sessionUser: User) => {
      if (getBackendMode() === 'demo') {
        const demoProfile = getDemoCurrentProfile();
        setProfile(demoProfile);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();

        if (error) throw error;

        if (!data) {
          const userData = sessionUser.user_metadata;
          const rawGithubId = userData?.user_name || userData?.preferred_username || 'unknown';
          const newProfile: Partial<Profile> = {
            id: userId,
            github_id: String(rawGithubId).toLowerCase(),
            name: userData?.full_name || userData?.name || 'Unknown User',
            avatar_url: userData?.avatar_url || '',
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select()
            .single();

          if (createError) throw createError;
          setProfile(createdProfile);
        } else {
          setProfile(data);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function initializeAuth() {
      const detectedMode = await detectBackendMode();
      if (!active) return;

      setMode(detectedMode);
      setModeMessage(getBackendMessage());

      if (detectedMode === 'demo') {
        if (!isDemoSignedIn()) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const demoProfile = getDemoCurrentProfile();
        if (!demoProfile) {
          setUser(null);
          setSession(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const demoUser = buildDemoUser(demoProfile);
        setUser(demoUser);
        setSession(buildDemoSession(demoUser));
        setProfile(demoProfile);
        setLoading(false);
        return;
      }

      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (!active) return;

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        void loadProfile(initialSession.user.id, initialSession.user);
      } else {
        setLoading(false);
      }

      const authListener = supabase.auth.onAuthStateChange((_event, nextSession) => {
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
        if (nextSession?.user) {
          void loadProfile(nextSession.user.id, nextSession.user);
        } else {
          setProfile(null);
          setLoading(false);
        }
      });

      subscription = authListener.data.subscription;
    }

    void initializeAuth();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [buildDemoSession, buildDemoUser, loadProfile]);

  async function signInWithGitHub() {
    if (mode === 'demo') {
      const demoProfile = getDemoCurrentProfile();
      if (!demoProfile) {
        throw new Error('Demo profile unavailable');
      }

      const demoUser = buildDemoUser(demoProfile);
      setDemoSignedIn(true);
      setUser(demoUser);
      setSession(buildDemoSession(demoUser));
      setProfile(demoProfile);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        scopes: 'read:user read:org',
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (mode === 'demo') {
      setDemoSignedIn(false);
      setUser(null);
      setSession(null);
      setProfile(null);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }

  async function refreshProfile() {
    if (mode === 'demo') {
      setProfile(getDemoCurrentProfile());
      return;
    }

    if (user) {
      await loadProfile(user.id, user);
    }
  }

  const value = {
    user,
    profile,
    session,
    loading,
    mode,
    modeMessage,
    signInWithGitHub,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
