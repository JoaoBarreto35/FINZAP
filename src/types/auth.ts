import type { Session, User } from "@supabase/supabase-js";

export type AuthUser = User;

export type AuthContextValue = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};