# shadcn Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add shadcn dark mode with `next-themes`, defaulting to dark theme.

**Architecture:** Install `next-themes`, create a client-side `ThemeProvider` wrapper, integrate into `AppProviders`, and add `suppressHydrationWarning` to the `<html>` element to handle the dark class mismatch during SSR.

**Tech Stack:** `next-themes`, Next.js App Router, shadcn/ui

---

### Task 1: Install next-themes

- [ ] **Step 1: Install package**

Run: `npm install next-themes`

Expected: Package added to dependencies in package.json

---

### Task 2: Create ThemeProvider component

**Files:**
- Create: `components/theme-provider.tsx`

- [ ] **Step 1: Create theme-provider.tsx**

```tsx
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

---

### Task 3: Integrate ThemeProvider into AppProviders

**Files:**
- Modify: `app/components/providers/AppProviders.tsx`

- [ ] **Step 1: Add ThemeProvider import and wrap children**

```tsx
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
```

---

### Task 4: Add suppressHydrationWarning to html element

**Files:**
- Modify: `app/layout.tsx:16`

- [ ] **Step 1: Add suppressHydrationWarning to html element**

```tsx
<html lang="en" className="h-full" suppressHydrationWarning>
```

---

### Task 5: Verify

- [ ] **Step 1: Run dev server and check**

Run: `npm run dev`
Expected: App loads in dark mode by default (dark background, light text)

---

**Plan complete.** Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**