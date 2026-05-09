import { supabase } from "../supabase/client";
import type { CreateWalletInput, Wallet } from "../../types/finance";

const walletFields =
  "id, workspace_id, name, type, owner_user_id, closing_day, due_day, active, created_at, updated_at";

export async function listWallets(workspaceId: string): Promise<Wallet[]> {
  const { data, error } = await supabase
    .from("wallets")
    .select(walletFields)
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createWallet(input: CreateWalletInput): Promise<Wallet> {
  const { data, error } = await supabase
    .from("wallets")
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      type: input.type,
      owner_user_id: input.owner_user_id ?? null,
      closing_day: input.closing_day ?? null,
      due_day: input.due_day ?? null,
    })
    .select(walletFields)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deactivateWallet(walletId: string): Promise<void> {
  const { error } = await supabase
    .from("wallets")
    .update({
      active: false,
    })
    .eq("id", walletId);

  if (error) {
    throw new Error(error.message);
  }
}