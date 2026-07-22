"use client";

import { useState, useEffect } from "react";
import { listThreads, Thread } from "@/lib/chat";

interface SidebarProps {
  activeThreadId: string | null;
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  refreshTrigger?: number;
}

export function Sidebar({ activeThreadId, onSelectThread, onNewChat, refreshTrigger }: SidebarProps) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await listThreads();
        if (!cancelled) setThreads(data);
      } catch {
        if (!cancelled) setThreads([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [refreshTrigger]);

  function formatTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  }

  if (collapsed) {
    return (
      <div className="flex flex-col border-r border-border-subtle bg-bg-surface-1 w-12 shrink-0 select-none transition-all duration-200">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center h-12 border-b border-border-subtle text-text-muted hover:text-text-primary transition-colors duration-150"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-1 pt-3">
          <button
            onClick={onNewChat}
            className="w-8 h-8 flex items-center justify-center text-text-muted hover:text-accent-primary hover:bg-bg-surface-2 rounded-lg transition-all duration-150"
            title="New chat"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {threads.slice(0, 20).map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectThread(t.id)}
              className={`w-8 h-8 flex items-center justify-center text-xs rounded-lg transition-all duration-150 ${
                t.id === activeThreadId
                  ? "bg-accent-primary/20 text-accent-primary"
                  : "text-text-faint hover:text-text-muted hover:bg-bg-surface-2"
              }`}
              title={t.title || "Untitled"}
            >
              {(t.title || "U")[0].toUpperCase()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col border-r border-border-subtle bg-bg-surface-1 w-64 shrink-0 select-none transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-border-subtle">
        <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Chats</span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-text-muted hover:text-text-primary transition-colors duration-150"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* New chat button */}
      <div className="p-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-surface-2 border border-border-subtle rounded-lg transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New chat</span>
        </button>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="px-3 py-6 text-center">
            <div className="text-xs text-text-faint animate-pulse">Loading threads...</div>
          </div>
        )}
        {!loading && threads.length === 0 && (
          <div className="px-3 py-6 text-center">
            <div className="text-xs text-text-faint">No threads yet</div>
          </div>
        )}
        {!loading && threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 ${
              thread.id === activeThreadId
                ? "bg-bg-surface-3 text-text-primary"
                : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
            }`}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm truncate">
                {thread.title || "Untitled"}
              </span>
              <span className="text-xs text-text-faint">
                {formatTime(thread.updated_at)}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border-subtle">
        <span className="text-xs text-text-faint">
          {threads.length} thread{threads.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
