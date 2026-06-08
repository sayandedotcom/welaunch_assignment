'use client';

import { useWorkspace } from '@/context/WorkspaceContext';
import { useChat } from '@/context/ChatContext';
import { useEffect, useState } from 'react';
import type { Workspace } from '@/lib/types';
import { Plus, X, MessageSquare } from 'lucide-react';

export function Sidebar() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace, deleteWorkspace } = useWorkspace();
  const { chats, currentChat, setCurrentChat, createChat, refreshChats } = useChat();
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  useEffect(() => {
    if (currentWorkspace) {
      refreshChats(currentWorkspace.id);
    }
  }, [currentWorkspace, refreshChats]);

  const handleWorkspaceSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
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
        <h2 className="text-sm font-semibold mb-3 text-sidebar-foreground/70 uppercase tracking-wide">Workspaces</h2>
        {showNewWorkspace ? (
          <div className="flex gap-2">
            <input
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddWorkspace()}
              className="flex-1 px-2 py-1.5 rounded-md bg-background text-foreground text-sm border border-input focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Workspace name"
              autoFocus
            />
            <button 
              onClick={handleAddWorkspace} 
              className="p-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              <Plus className="size-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => setShowNewWorkspace(true)} 
            className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 cursor-pointer"
          >
            <Plus className="size-4" />
            New Workspace
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {workspaces.map(ws => (
          <div key={ws.id}>
            <div
              onClick={() => handleWorkspaceSelect(ws)}
              className={`flex items-center gap-2.5 px-4 py-2.5 cursor-pointer hover:bg-sidebar-accent transition-colors ${currentWorkspace?.id === ws.id ? 'bg-sidebar-accent' : ''}`}
            >
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: ws.color }} />
              <span className="flex-1 truncate text-sm">{ws.name}</span>
              <button 
                onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id); }} 
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-accent-foreground/10 cursor-pointer"
              >
                <X className="size-3.5 text-sidebar-foreground/50 hover:text-destructive" />
              </button>
            </div>

            {currentWorkspace?.id === ws.id && (
              <div className="ml-4 border-l border-sidebar-border">
                <button 
                  onClick={handleCreateChat} 
                  className="flex items-center gap-1.5 w-full text-left px-4 py-2 text-sm text-primary hover:text-primary/80 cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  New Chat
                </button>
                {chats.filter(c => c.workspaceId === ws.id).map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setCurrentChat(chat)}
                    className={`flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-sidebar-accent text-sm truncate transition-colors ${currentChat?.id === chat.id ? 'bg-sidebar-accent text-primary' : 'text-sidebar-foreground/70'}`}
                  >
                    <MessageSquare className="size-3.5 shrink-0" />
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
