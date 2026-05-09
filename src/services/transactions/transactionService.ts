import { supabase } from "../supabase/client";
import type { CreateTransactionInput, Transaction } from "../../types/finance";

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
  createdBy: string,
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({
      workspace_id: input.workspace_id,
      wallet_id: input.wallet_id ?? null,
      invoice_id: input.invoice_id ?? null,
      category_id: input.category_id ?? null,
      created_by: createdBy,
      responsible_user_id: input.responsible_user_id ?? null,
      amount: input.amount,
      description: input.description,
      transaction_date: input.transaction_date,
      transaction_type: input.transaction_type ?? "single",
      status: input.status ?? "pending",
      source: "web",
    })
    .select(transactionFields)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await createTransactionEvent({
    workspace_id: data.workspace_id,
    transaction_id: data.id,
    user_id: createdBy,
    event_type: "transaction_created",
    new_data: data,
    description: "Transação criada pelo painel web.",
  });

  return data;
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

type CreateTransactionEventInput = {
  workspace_id: string;
  transaction_id: string;
  user_id: string;
  event_type: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  description?: string;
};

async function createTransactionEvent(input: CreateTransactionEventInput): Promise<void> {
  const { error } = await supabase.from("transaction_events").insert({
    workspace_id: input.workspace_id,
    transaction_id: input.transaction_id,
    user_id: input.user_id,
    event_type: input.event_type,
    old_data: input.old_data ?? null,
    new_data: input.new_data ?? null,
    description: input.description ?? null,
  });

  if (error) {
    console.error("Erro ao criar evento da transação:", error.message);
  }
}