'use client';

import { Sidebar } from './components/Sidebar';
import { ChatBlock } from './components/ChatBlock';

export default function Home() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 flex flex-col bg-white dark:bg-zinc-950">
        <ChatBlock />
      </main>
    </div>
  );
}
