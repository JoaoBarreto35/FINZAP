import { supabase } from "../supabase/client";
import type { Category, CreateCategoryInput } from "../../types/finance";

const categoryFields =
  "id, workspace_id, name, color, icon, active, created_at, updated_at";

export async function listCategories(workspaceId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(categoryFields)
    .eq("workspace_id", workspaceId)
    .eq("active", true)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      color: input.color ?? null,
      icon: input.icon ?? null,
    })
    .select(categoryFields)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deactivateCategory(categoryId: string): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update({
      active: false,
    })
    .eq("id", categoryId);

  if (error) {
    throw new Error(error.message);
  }
}