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
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setProfile(null);
      return;
    }

    const currentProfile = await getMyProfile(data.user.id);
    setProfile(currentProfile);
  }, []);

  async function signIn(input: SignInInput) {
    await signInWithEmail(input);
    await refreshProfile();
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
      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error("Erro ao buscar sessão:", error.message);
      }

      const currentSession = data.session;
      const currentUser = currentSession?.user ?? null;

      setSession(currentSession);
      setUser(currentUser);

      if (currentUser) {
        try {
          const currentProfile = await getMyProfile(currentUser.id);

          if (isMounted) {
            setProfile(currentProfile);
          }
        } catch (profileError) {
          console.error("Erro ao buscar profile:", profileError);
        }
      }

      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (!currentSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const currentProfile = await getMyProfile(currentSession.user.id);
        setProfile(currentProfile);
      } catch (profileError) {
        console.error("Erro ao atualizar profile:", profileError);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
    [user, session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}