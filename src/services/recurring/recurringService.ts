import { supabase } from "../supabase/client";
import type {
  CreateRecurringRuleInput,
  RecurringRule,
  UpdateRecurringRuleInput,
} from "../../types/finance";

const recurringRuleFields =
  "id, workspace_id, wallet_id, category_id, created_by, responsible_user_id, description, amount, frequency, charge_day, start_month, start_year, end_month, end_year, active, created_at, updated_at";

export async function listRecurringRules(
  workspaceId: string,
): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from("recurring_rules")
    .select(recurringRuleFields)
    .eq("workspace_id", workspaceId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createRecurringRule(
  input: CreateRecurringRuleInput,
): Promise<RecurringRule> {
  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      workspace_id: input.workspace_id,
      wallet_id: input.wallet_id,
      category_id: input.category_id ?? null,
      responsible_user_id: input.responsible_user_id ?? null,
      description: input.description.trim(),
      amount: input.amount,
      frequency: input.frequency ?? "monthly",
      charge_day: input.charge_day,
      start_month: input.start_month,
      start_year: input.start_year,
      end_month: input.end_month ?? null,
      end_year: input.end_year ?? null,
    })
    .select(recurringRuleFields)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateRecurringRule(
  ruleId: string,
  input: UpdateRecurringRuleInput,
): Promise<RecurringRule> {
  const { data, error } = await supabase
    .from("recurring_rules")
    .update({
      wallet_id: input.wallet_id,
      category_id: input.category_id ?? null,
      responsible_user_id: input.responsible_user_id ?? null,
      description: input.description.trim(),
      amount: input.amount,
      charge_day: input.charge_day,
      start_month: input.start_month,
      start_year: input.start_year,
      end_month: input.end_month ?? null,
      end_year: input.end_year ?? null,
      active: input.active,
    })
    .eq("id", ruleId)
    .select(recurringRuleFields)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deactivateRecurringRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_rules")
    .update({
      active: false,
    })
    .eq("id", ruleId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function generateRecurringTransactionsForMonth(
  workspaceId: string,
  month: number,
  year: number,
): Promise<number> {
  const { data, error } = await supabase.rpc(
    "generate_recurring_transactions_for_month",
    {
      p_workspace_id: workspaceId,
      p_month: month,
      p_year: year,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return Number(data ?? 0);
}