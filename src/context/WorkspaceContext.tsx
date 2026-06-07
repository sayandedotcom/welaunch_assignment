'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Workspace {
  id: string;
  name: string;
  color: string;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (w: Workspace) => void;
  addWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, name: string, color: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);

  const refreshWorkspaces = async () => {
    const res = await fetch('/api/workspaces');
    const data = await res.json();
    setWorkspaces(data);
    if (data.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(data[0]);
    }
  };

  useEffect(() => { refreshWorkspaces(); }, []);

  const addWorkspace = async (name: string) => {
    const res = await fetch('/api/workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const workspace = await res.json();
    setWorkspaces([workspace, ...workspaces]);
    setCurrentWorkspace(workspace);
  };

  const updateWorkspace = async (id: string, name: string, color: string) => {
    await fetch(`/api/workspaces/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    });
    await refreshWorkspaces();
  };

  const deleteWorkspace = async (id: string) => {
    await fetch(`/api/workspaces/${id}`, { method: 'DELETE' });
    setWorkspaces(workspaces.filter(w => w.id !== id));
    if (currentWorkspace?.id === id) {
      setCurrentWorkspace(workspaces[0] || null);
    }
  };

  return (
    <WorkspaceContext.Provider value={{
      workspaces, currentWorkspace, setCurrentWorkspace,
      addWorkspace, updateWorkspace, deleteWorkspace, refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext)!;