'use client';

import { useWorkspace } from '@/context/WorkspaceContext';
import { useChat } from '@/context/ChatContext';
import { useState } from 'react';
import type { Workspace } from '@/lib/types';

export function Sidebar() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, deleteWorkspace } = useWorkspace();
  const { chats, currentChat, setCurrentChat, createChat, refreshChats } = useChat();
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  const handleWorkspaceSelect = async (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    await refreshChats(workspace.id);
  };

  const handleCreateChat = async () => {
    if (!currentWorkspace) return;
    await createChat(currentWorkspace.id);
  };

  const handleAddWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    await addWorkspace(newWorkspaceName);
    setNewWorkspaceName('');
    setShowNewWorkspace(false);
  };

  return (
    <div className="w-64 h-full bg-sidebar text-sidebar-foreground flex flex-col border-r border-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-lg font-semibold mb-2">Workspaces</h2>
        {showNewWorkspace ? (
          <div className="flex gap-2">
            <input
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-background text-foreground text-sm border border-input"
              placeholder="Workspace name"
            />
            <button onClick={handleAddWorkspace} className="px-2 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/80">Add</button>
          </div>
        ) : (
          <button onClick={() => setShowNewWorkspace(true)} className="text-sm text-primary hover:underline">
            + New Workspace
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {workspaces.map(ws => (
          <div key={ws.id}>
            <div
              onClick={() => handleWorkspaceSelect(ws)}
              className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-accent ${currentWorkspace?.id === ws.id ? 'bg-accent' : ''}`}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ws.color }} />
              <span className="flex-1 truncate">{ws.name}</span>
              <button onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id); }} className="text-muted-foreground hover:text-destructive text-xs">×</button>
            </div>

            {currentWorkspace?.id === ws.id && (
              <div className="ml-4 border-l border-sidebar-border">
                <button onClick={handleCreateChat} className="w-full text-left px-4 py-1 text-sm text-primary hover:underline">
                  + New Chat
                </button>
                {chats.filter(c => c.workspaceId === ws.id).map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setCurrentChat(chat)}
                    className={`px-4 py-1 cursor-pointer hover:bg-accent text-sm truncate ${currentChat?.id === chat.id ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                  >
                    {chat.title}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
