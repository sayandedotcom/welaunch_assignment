'use client';

import { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ChatProvider } from '@/context/ChatContext';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <ChatProvider>
        {children}
      </ChatProvider>
    </WorkspaceProvider>
  );
}