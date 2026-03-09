import React from 'react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function Layout({ children, className }: LayoutProps) {
  return (
    <div className={cn("min-h-screen bg-gray-50", className)}>
      {children}
    </div>
  );
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">CAGUAYO</h1>
      </div>
      <nav className="space-y-2">
        {children}
      </nav>
    </div>
  );
}

export function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {children}
      </div>
    </header>
  );
}

export function MainContent({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 p-6">
      {children}
    </main>
  );
}