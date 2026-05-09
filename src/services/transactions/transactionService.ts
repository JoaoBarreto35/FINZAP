import { supabase } from "../supabase/client";
import type {
  CreateTransactionInput,
  Transaction,
  UpdateTransactionInput,
} from "../../types/finance";

const transactionFields =
  "id, workspace_id, wallet_id, invoice_id, category_id, created_by, responsible_user_id, amount, description, transaction_date, transaction_type, status, source, installment_group_id, installment_number, installment_total, recurring_rule_id, created_at, updated_at";

export async function listTransactions(workspaceId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select(transactionFields)
    .eq("workspace_id", workspaceId)
    .order("transaction_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createTransaction(
  input: CreateTransactionInput,
  _createdBy: string,
): Promise<Transaction> {
  const { data, error } = await supabase.rpc("create_transaction_with_invoice", {
    p_workspace_id: input.workspace_id,
    p_wallet_id: input.wallet_id ?? null,
    p_category_id: input.category_id ?? null,
    p_responsible_user_id: input.responsible_user_id ?? null,
    p_amount: input.amount,
    p_description: input.description,
    p_transaction_date: input.transaction_date,
    p_transaction_type: input.transaction_type ?? "single",
    p_status: input.status ?? "pending",
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Não foi possível criar a transação.");
  }

  return data as Transaction;
}

export async function updateTransaction(
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const { data, error } = await supabase.rpc("update_transaction_with_invoice", {
    p_transaction_id: transactionId,
    p_wallet_id: input.wallet_id ?? null,
    p_category_id: input.category_id ?? null,
    p_responsible_user_id: input.responsible_user_id ?? null,
    p_amount: input.amount,
    p_description: input.description,
    p_transaction_date: input.transaction_date,
    p_status: input.status,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Não foi possível atualizar a transação.");
  }

  return data as Transaction;
}

export async function markTransactionAsPaid(transactionId: string): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({
      status: "paid",
    })
    .eq("id", transactionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function cancelTransaction(transactionId: string): Promise<void> {
  const { error } = await supabase
    .from("transactions")
    .update({
      status: "cancelled",
    })
    .eq("id", transactionId);

  if (error) {
    throw new Error(error.message);
  }
}