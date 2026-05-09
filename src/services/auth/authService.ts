import { supabase } from "../supabase/client";
import type { Profile, SignInInput, SignUpInput } from "../../types/auth";

export async function signInWithEmail(input: SignInInput) {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpWithEmail(input: SignUpInput) {
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        name: input.name,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, phone, avatar_url, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}