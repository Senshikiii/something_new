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
      <div className="flex flex-col border-r border-[#eaeaea] bg-white w-14 shrink-0 select-none transition-all duration-200">
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center h-14 border-b border-[#eaeaea] text-gray-400 hover:text-black transition-colors duration-150"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-1 pt-3">
          <button
            onClick={onNewChat}
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-black hover:bg-[#fafafa] rounded-lg transition-all duration-150"
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
              className={`w-9 h-9 flex items-center justify-center text-xs rounded-lg transition-all duration-150 ${
                t.id === activeThreadId
                  ? "bg-black text-white"
                  : "text-gray-400 hover:text-gray-700 hover:bg-[#fafafa]"
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
    <div className="flex flex-col border-r border-[#eaeaea] bg-white w-64 shrink-0 select-none transition-all duration-200">
      <div className="flex items-center justify-between h-14 px-4 border-b border-[#eaeaea]">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
          Chats
        </span>
        <button
          onClick={() => setCollapsed(true)}
          className="text-gray-400 hover:text-black transition-colors duration-150"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-[#fafafa] border border-[#eaeaea] rounded-lg transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>New chat</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="px-3 py-6 text-center">
            <div className="text-xs text-gray-300 animate-pulse">Loading...</div>
          </div>
        )}
        {!loading && threads.length === 0 && (
          <div className="px-3 py-6 text-center">
            <div className="text-xs text-gray-300">No threads yet</div>
          </div>
        )}
        {!loading && threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelectThread(thread.id)}
            className={`w-full text-left px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 ${
              thread.id === activeThreadId
                ? "bg-[#f5f5f5] text-black"
                : "text-gray-500 hover:bg-[#fafafa] hover:text-black"
            }`}
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm truncate font-medium">
                {thread.title || "Untitled"}
              </span>
              <span className="text-xs text-gray-300">
                {formatTime(thread.updated_at)}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-[#eaeaea]">
        <span className="text-xs text-gray-300">
          {threads.length} thread{threads.length !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
