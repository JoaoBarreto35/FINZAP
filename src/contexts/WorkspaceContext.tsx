import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createWorkspaceRecord, listMyWorkspaces } from "../services/workspaces/workspaceService";
import type {
  CreateWorkspaceInput,
  Workspace,
  WorkspaceContextValue,
} from "../types/workspace";
import { useAuth } from "../hooks/useAuth";
import { useLocalStorage } from "../hooks/useLocalStorage";

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

type WorkspaceProviderProps = {
  children: ReactNode;
};

const ACTIVE_WORKSPACE_KEY = "finzap:active-workspace-id";

export function WorkspaceProvider({ children }: WorkspaceProviderProps) {
  const { user } = useAuth();
  const { getItem, setItem, removeItem } = useLocalStorage();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const selectWorkspace = useCallback(
    (workspaceId: string) => {
      const selected = workspaces.find((workspace) => workspace.id === workspaceId) ?? null;

      setActiveWorkspace(selected);

      if (selected) {
        setItem(ACTIVE_WORKSPACE_KEY, selected.id);
      } else {
        removeItem(ACTIVE_WORKSPACE_KEY);
      }
    },
    [workspaces, setItem, removeItem],
  );

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      removeItem(ACTIVE_WORKSPACE_KEY);
      return;
    }

    setLoading(true);

    try {
      const data = await listMyWorkspaces();

      setWorkspaces(data);

      const savedWorkspaceId = getItem(ACTIVE_WORKSPACE_KEY);
      const savedWorkspace = data.find((workspace) => workspace.id === savedWorkspaceId);
      const fallbackWorkspace = data[0] ?? null;

      const nextWorkspace = savedWorkspace ?? fallbackWorkspace;

      setActiveWorkspace(nextWorkspace);

      if (nextWorkspace) {
        setItem(ACTIVE_WORKSPACE_KEY, nextWorkspace.id);
      } else {
        removeItem(ACTIVE_WORKSPACE_KEY);
      }
    } finally {
      setLoading(false);
    }
  }, [user, getItem, setItem, removeItem]);

  const createWorkspace = useCallback(
    async (input: CreateWorkspaceInput) => {
      const createdWorkspace = await createWorkspaceRecord(input);

      const nextWorkspaces = [...workspaces, createdWorkspace];

      setWorkspaces(nextWorkspaces);
      setActiveWorkspace(createdWorkspace);
      setItem(ACTIVE_WORKSPACE_KEY, createdWorkspace.id);

      return createdWorkspace;
    },
    [workspaces, setItem],
  );

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      activeWorkspace,
      loading,
      createWorkspace,
      selectWorkspace,
      refreshWorkspaces,
    }),
    [workspaces, activeWorkspace, loading, createWorkspace, selectWorkspace, refreshWorkspaces],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}