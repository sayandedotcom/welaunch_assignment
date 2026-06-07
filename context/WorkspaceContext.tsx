'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Workspace as WorkspaceType } from '@/lib/types';

interface WorkspaceContextType {
  workspaces: WorkspaceType[];
  currentWorkspace: WorkspaceType | null;
  setCurrentWorkspace: (w: WorkspaceType) => void;
  addWorkspace: (name: string) => Promise<void>;
  updateWorkspace: (id: string, name: string, color: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<WorkspaceType[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceType | null>(null);

  const refreshWorkspaces = async () => {
    const res = await fetch('/api/workspaces');
    const data = await res.json();
    setWorkspaces(data);
    return data;
  };

  useEffect(() => {
    let mounted = true;

    async function init() {
      const data = await refreshWorkspaces();
      if (mounted && data.length > 0) {
        setCurrentWorkspace(data[0]);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSetCurrentWorkspace = (w: WorkspaceType) => {
    setCurrentWorkspace(w);
  };

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
      workspaces, currentWorkspace, setCurrentWorkspace: handleSetCurrentWorkspace,
      addWorkspace, updateWorkspace, deleteWorkspace, refreshWorkspaces,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => useContext(WorkspaceContext)!;
