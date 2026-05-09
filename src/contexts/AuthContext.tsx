import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase/client";
import {
  getMyProfile,
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
} from "../services/auth/authService";
import type {
  AuthContextValue,
  Profile,
  SignInInput,
  SignUpInput,
} from "../types/auth";

export const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const currentProfile = await getMyProfile(user.id);
      setProfile(currentProfile);
    } catch (error) {
      console.error("[AuthContext] Erro ao buscar profile:", error);
      setProfile(null);
    }
  }, [user]);

  async function signIn(input: SignInInput) {
    await signInWithEmail(input);
  }

  async function signUp(input: SignUpInput) {
    await signUpWithEmail(input);
  }

  async function signOut() {
    await signOutUser();
    setSession(null);
    setUser(null);
    setProfile(null);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (error) {
          console.error("[AuthContext] Erro no getSession:", error.message);
        }

        const currentSession = data.session;
        const currentUser = currentSession?.user ?? null;

        setSession(currentSession);
        setUser(currentUser);
      } catch (error) {
        console.error("[AuthContext] Erro inesperado ao carregar sessão:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    let isMounted = true;

    async function loadProfile() {
      try {
        const currentProfile = await getMyProfile(user.id);

        if (isMounted) {
          setProfile(currentProfile);
        }
      } catch (error) {
        console.error("[AuthContext] Erro ao carregar profile:", error);

        if (isMounted) {
          setProfile(null);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, session, profile, loading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}