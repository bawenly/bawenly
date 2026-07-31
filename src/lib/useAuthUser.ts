import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>();

  useEffect(() => {
    let isMounted = true;
    let hasAuthEvent = false;
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      hasAuthEvent = true;
      if (isMounted) setUser(session?.user ?? null);
    });

    void supabase.auth.getSession().then(({ data: sessionData }) => {
      if (isMounted && !hasAuthEvent) setUser(sessionData.session?.user ?? null);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return user;
}
