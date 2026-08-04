import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { loadProfile, Profile } from '../lib/profile';
import { supabase } from '../lib/supabase';
import { recordVisit } from '../lib/visitStreak';

type ProfileContextValue = {
  user: User | null | undefined;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile(nextUser = user) {
    if (!nextUser) {
      setProfile(null);
      return;
    }
    setProfile(await loadProfile(nextUser));
  }

  useEffect(() => {
    let active = true;
    let authUpdateTimer: number | undefined;
    const applyUser = async (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      try {
        if (!nextUser) {
          setProfile(null);
        } else {
          const visitStreak = await recordVisit(nextUser);
          const nextProfile = await loadProfile(nextUser);
          setProfile({ ...nextProfile, visitStreak });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      if (active) {
        setUser(nextUser);
        if (!nextUser) setProfile(null);
      }
      // Supabase auth callbacks must finish before another Supabase request starts.
      // Defer profile loading so sign-in/sign-up can release the auth lock first.
      window.clearTimeout(authUpdateTimer);
      authUpdateTimer = window.setTimeout(() => {
        void applyUser(nextUser);
      }, 0);
    });
    return () => {
      active = false;
      window.clearTimeout(authUpdateTimer);
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <ProfileContext.Provider value={{ user, profile, loading, refreshProfile: () => refreshProfile() }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const value = useContext(ProfileContext);
  if (!value) throw new Error('useProfile must be used inside ProfileProvider');
  return value;
}
