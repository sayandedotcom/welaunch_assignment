'use client';

import { ReactNode } from 'react';
import { WorkspaceProvider } from '@/context/WorkspaceContext';
import { ChatProvider } from '@/context/ChatContext';
import { ThemeProvider } from '@/components/theme-provider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WorkspaceProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </WorkspaceProvider>
    </ThemeProvider>
  );
}