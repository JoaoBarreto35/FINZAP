import { supabase } from "../supabase/client";
import type {
  CreateInstallmentPurchaseInput,
  InstallmentGroup,
} from "../../types/finance";

const installmentGroupFields =
  "id, workspace_id, wallet_id, category_id, created_by, responsible_user_id, description, total_amount, installment_amount, installments_count, first_month, first_year, status, created_at, updated_at";

export async function listInstallmentGroups(
  workspaceId: string,
): Promise<InstallmentGroup[]> {
  const { data, error } = await supabase
    .from("installment_groups")
    .select(installmentGroupFields)
    .eq("workspace_id", workspaceId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createInstallmentPurchase(
  input: CreateInstallmentPurchaseInput,
): Promise<InstallmentGroup> {
  const { data, error } = await supabase.rpc("create_installment_purchase", {
    p_workspace_id: input.workspace_id,
    p_wallet_id: input.wallet_id,
    p_category_id: input.category_id ?? null,
    p_responsible_user_id: input.responsible_user_id ?? null,
    p_description: input.description,
    p_total_amount: input.total_amount,
    p_installments_count: input.installments_count,
    p_first_month: input.first_month,
    p_first_year: input.first_year,
    p_status: input.status ?? "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Não foi possível criar a compra parcelada.");
  }

  return data as InstallmentGroup;
}

export async function cancelInstallmentGroup(groupId: string): Promise<void> {
  const { error } = await supabase
    .from("installment_groups")
    .update({
      status: "cancelled",
    })
    .eq("id", groupId);

  if (error) {
    throw new Error(error.message);
  }

  const { error: transactionsError } = await supabase
    .from("transactions")
    .update({
      status: "cancelled",
    })
    .eq("installment_group_id", groupId)
    .neq("status", "paid");

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }
}