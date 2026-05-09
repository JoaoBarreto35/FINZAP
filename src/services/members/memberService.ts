import { supabase } from "../supabase/client";
import type {
  AddWorkspaceMemberInput,
  WorkspaceMember,
  WorkspaceMemberRole,
  WorkspaceMemberWithProfile,
} from "../../types/workspace";

type ProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
};

const memberFields =
  "id, workspace_id, user_id, role, status, created_at, updated_at";

export async function listWorkspaceMembers(
  workspaceId: string,
): Promise<WorkspaceMemberWithProfile[]> {
  const { data: membersData, error: membersError } = await supabase
    .from("workspace_members")
    .select(memberFields)
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("created_at", {
      ascending: true,
    });

  if (membersError) {
    throw new Error(membersError.message);
  }

  const members = (membersData ?? []) as WorkspaceMember[];

  if (members.length === 0) {
    return [];
  }

  const userIds = members.map((member) => member.user_id);

  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profilesById = new Map(
    ((profilesData ?? []) as ProfileRow[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );

  return members.map((member) => ({
    ...member,
    profile: profilesById.get(member.user_id) ?? null,
  }));
}

export async function addWorkspaceMember(
  input: AddWorkspaceMemberInput,
): Promise<void> {
  const { error } = await supabase.rpc("add_workspace_member_by_email", {
    p_workspace_id: input.workspace_id,
    p_email: input.email,
    p_role: input.role,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateWorkspaceMemberRole(
  memberId: string,
  role: Exclude<WorkspaceMemberRole, "owner">,
): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .update({
      role,
    })
    .eq("id", memberId)
    .neq("role", "owner");

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeWorkspaceMember(
  workspaceId: string,
  memberId: string,
): Promise<void> {
  const { error } = await supabase.rpc("remove_workspace_member", {
    p_workspace_id: workspaceId,
    p_member_id: memberId,
  });

  if (error) {
    throw new Error(error.message);
  }
}