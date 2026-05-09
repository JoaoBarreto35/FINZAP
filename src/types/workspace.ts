export type WorkspaceStatus = "active" | "archived" | "deleted";

export type WorkspaceMemberRole = "owner" | "admin" | "editor" | "viewer";

export type WorkspaceMemberStatus = "active" | "pending" | "removed";

export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: WorkspaceStatus;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceMemberRole;
  status: WorkspaceMemberStatus;
  created_at: string;
  updated_at: string;
};

export type CreateWorkspaceInput = {
  name: string;
  description?: string;
};

export type WorkspaceContextValue = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  loading: boolean;
  createWorkspace: (input: CreateWorkspaceInput) => Promise<Workspace>;
  selectWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
};

export type WorkspaceMemberWithProfile = WorkspaceMember & {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
};

export type AddWorkspaceMemberInput = {
  workspace_id: string;
  email: string;
  role: Exclude<WorkspaceMemberRole, "owner">;
};