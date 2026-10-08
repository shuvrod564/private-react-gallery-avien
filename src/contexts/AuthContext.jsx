import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, getSessionUser } from '../lib/supabase';
import { fetchProfile } from '../services/authService';
import { isSupabaseConfigured } from '../lib/env';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid) => {
    if (!isSupabaseConfigured) return null;
    const p = await fetchProfile(uid);
    setProfile(p);
    return p;
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      try {
        const userNow = await getSessionUser();

        if (!active) return;

        setUser(userNow);

        if (userNow) {
          await refreshProfile(userNow.id);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);

        if (active) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    init();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        active = false;
      };
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      setUser(next);
      if (next) refreshProfile(next.id);
      else setProfile(null);
    });

    return () => {
      active = false;
      sub?.subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      isAdmin: Boolean(profile?.role === 'admin'),
      isSupabaseConfigured,
      refreshProfile,
    }),
    [user, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
