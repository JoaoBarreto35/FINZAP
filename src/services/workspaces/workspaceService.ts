import { supabase } from "../supabase/client";
import type { CreateWorkspaceInput, Workspace } from "../../types/workspace";

export async function listMyWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, description, owner_id, status, created_at, updated_at")
    .eq("status", "active")
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createWorkspaceRecord(input: CreateWorkspaceInput): Promise<Workspace> {
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: input.name,
    p_description: input.description ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Não foi possível criar o workspace.");
  }

  return data as Workspace;
}

export async function updateWorkspaceRecord(
  workspaceId: string,
  input: CreateWorkspaceInput,
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .update({
      name: input.name,
      description: input.description ?? null,
    })
    .eq("id", workspaceId)
    .select("id, name, description, owner_id, status, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}