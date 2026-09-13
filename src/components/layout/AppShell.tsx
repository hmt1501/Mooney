'use client';

import React from 'react';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen w-full flex justify-center bg-background-subtle antialiased">
      {/* Centered mobile-first application shell */}
      <main className="relative w-full max-w-[440px] min-h-screen bg-background flex flex-col shadow-card sm:border-x sm:border-border transition-colors duration-200">
        {children}
      </main>
    </div>
  );
}
