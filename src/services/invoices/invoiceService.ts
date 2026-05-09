import { supabase } from "../supabase/client";
import type { CreateInvoiceInput, Invoice } from "../../types/finance";

const invoiceFields =
  "id, workspace_id, wallet_id, month, year, status, closed_at, paid_at, paid_by, created_at, updated_at";

export async function listInvoices(workspaceId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(invoiceFields)
    .eq("workspace_id", workspaceId)
    .order("year", {
      ascending: false,
    })
    .order("month", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      workspace_id: input.workspace_id,
      wallet_id: input.wallet_id,
      month: input.month,
      year: input.year,
    })
    .select(invoiceFields)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function markInvoiceAsPaid(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function closeInvoice(invoiceId: string): Promise<void> {
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
    })
    .eq("id", invoiceId);

  if (error) {
    throw new Error(error.message);
  }
}