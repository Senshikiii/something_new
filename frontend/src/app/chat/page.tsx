"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { CostDashboard } from "@/components/chat/cost-dashboard";
import { TerminalMessage } from "@/components/chat/message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { Sidebar } from "@/components/chat/sidebar";
import { supabase } from "@/lib/supabase";
import { createThread, loadMessages, sendMessage, getSettings } from "@/lib/chat";
import { BACKEND_URL } from "@/lib/config";

const MODEL_LABELS: Record<string, string> = {
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-pro": "Gemini 2.5 Pro",
  "llama-3.3-70b-versatile": "Groq Llama 3.3 70B",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "moonshot-v1-auto": "Kimi",
};

interface Message {
  id?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
}

interface StreamMsg {
  id: string;
  role: "assistant";
  content: string;
  tool_calls?: any[];
}

export default function ChatPage() {
  const [initializing, setInitializing] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinkingIteration, setThinkingIteration] = useState<number | undefined>();
  const [creditBalance, setCreditBalance] = useState(0);
  const [modelName, setModelName] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamMsgRef = useRef<StreamMsg | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        window.location.href = "/";
        return;
      }
      const s = getSettings();
      setModelName(s.model);
      const params = new URLSearchParams(window.location.search);
      const tid = params.get("thread_id");
      if (tid) {
        setThreadId(tid);
        try {
          const msgs = await loadMessages(tid);
          setMessages(msgs);
        } catch (e: any) {
          setMessages([{ role: "assistant", content: `Failed to load messages: ${e.message}` }]);
        }
      } else {
        try {
          const thread = await createThread();
          setThreadId(thread.id);
          window.history.replaceState(null, "", `/chat?thread_id=${thread.id}`);
        } catch (e: any) {
          setMessages([{ role: "assistant", content: `Failed to create thread: ${e.message}` }]);
        }
      }
      if (session.access_token) {
        try {
          const res = await fetch(
            `${BACKEND_URL}/api/credits/balance`,
            { headers: { Authorization: `Bearer ${session.access_token}` } }
          );
          const data = await res.json();
          setCreditBalance(data.credits ?? 0);
        } catch {}
      }
      setInitializing(false);
    };
    init();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  function handleNewChat() {
    setMessages([]);
    setStreaming(false);
    setThinkingIteration(undefined);
    streamMsgRef.current = null;
    (async () => {
      try {
        const thread = await createThread();
        setThreadId(thread.id);
        setRefreshTrigger((n) => n + 1);
        window.history.replaceState(null, "", `/chat?thread_id=${thread.id}`);
      } catch (e: any) {
        setMessages([{ role: "assistant", content: `Failed to create thread: ${e.message}` }]);
      }
    })();
  }

  async function handleSelectThread(tid: string) {
    if (tid === threadId || streaming) return;
    setMessages([]);
    setStreaming(false);
    setThinkingIteration(undefined);
    streamMsgRef.current = null;
    setThreadId(tid);
    window.history.replaceState(null, "", `/chat?thread_id=${tid}`);
    try {
      const msgs = await loadMessages(tid);
      setMessages(msgs);
    } catch (e: any) {
      setMessages([{ role: "assistant", content: `Failed to load messages: ${e.message}` }]);
    }
  }

  async function handleSend() {
    if (!input.trim() || !threadId || streaming) return;

    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setThinkingIteration(1);
    scrollToBottom();

    streamMsgRef.current = { id: crypto.randomUUID(), role: "assistant", content: "" };

    await sendMessage(
      threadId,
      text,
      (event) => {
        if (event.type === "content") {
          streamMsgRef.current!.content += event.text;
          setMessages((prev) => {
            const copy = [...prev];
            const last = copy[copy.length - 1];
            if (last && last.role === "assistant" && last.id === streamMsgRef.current?.id) {
              copy[copy.length - 1] = { ...last, content: streamMsgRef.current!.content };
            } else {
              copy.push({ ...streamMsgRef.current! });
            }
            return copy;
          });
          setThinkingIteration(undefined);
          scrollToBottom();
        } else if (event.type === "tool_call") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant" as const,
              content: "",
              tool_calls: [{ tool: event.tool, args: event.args }],
              id: crypto.randomUUID(),
            },
          ]);
          scrollToBottom();
        } else if (event.type === "tool_result") {
          setMessages((prev) => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i].role === "assistant" && copy[i].tool_calls?.length) {
                copy[i] = { ...copy[i], content: event.text };
                break;
              }
            }
            return copy;
          });
        } else if (event.type === "thinking") {
          setThinkingIteration((prev) => (prev || 1) + 1);
        } else if (event.type === "error") {
          streamMsgRef.current = null;
          setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${event.text}` }]);
        }
      },
      () => {
        setStreaming(false);
        setThinkingIteration(undefined);
        streamMsgRef.current = null;
        (async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            try {
              const res = await fetch(
                `${BACKEND_URL}/api/credits/balance`,
                { headers: { Authorization: `Bearer ${session.access_token}` } }
              );
              const data = await res.json();
              setCreditBalance(data.credits ?? 0);
            } catch {}
          }
        })();
        scrollToBottom();
      },
      (err) => {
        setMessages((prev) => [...prev, { role: "assistant" as const, content: `Error: ${err}` }]);
        setStreaming(false);
        setThinkingIteration(undefined);
        streamMsgRef.current = null;
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (initializing) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg-base">
        <div className="text-xs text-text-faint animate-pulse">Loading...</div>
      </div>
    );
  }

  const friendlyModel = MODEL_LABELS[modelName] || modelName;

  return (
    <div className="flex flex-1 h-screen">
      <Sidebar
        activeThreadId={threadId}
        onSelectThread={handleSelectThread}
        onNewChat={handleNewChat}
        refreshTrigger={refreshTrigger}
      />

      <div className="flex-1 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border-subtle bg-bg-surface-1 select-none shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-text-primary hover:text-accent-primary transition-colors">
              MicroManus
            </Link>
            {threadId && (
              <span className="text-xs text-text-faint font-mono">
                #{threadId.slice(0, 6)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-accent-success font-medium">{creditBalance}c</span>
            {friendlyModel && (
              <>
                <span className="text-text-faint">&middot;</span>
                <span className="text-text-muted">{friendlyModel}</span>
              </>
            )}
            <CostDashboard />
            <Button variant="ghost" size="sm" onClick={handleNewChat} disabled={streaming} className="text-xs text-text-muted hover:text-text-primary transition-colors">
              + New
            </Button>
            <SettingsDialog />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-text-muted hover:text-accent-danger transition-colors">
              Logout
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-bg-base">
          <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
            {messages.length === 0 && !streaming && (
              <div className="animate-fade-in flex flex-col items-center justify-center py-24 text-center">
                <h2 className="text-2xl font-bold tracking-tight mb-2">
                  <span className="bg-gradient-to-r from-accent-primary to-purple-400 bg-clip-text text-transparent">
                    MicroManus
                  </span>
                </h2>
                <p className="text-sm text-text-muted">Research agent ready. Set your API key in settings, then ask anything.</p>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === "tool") return null;
              return (
                <TerminalMessage
                  key={msg.id || i}
                  role={msg.role}
                  content={msg.content}
                  tool_calls={msg.tool_calls}
                  isStreaming={streaming && i === messages.length - 1 && msg.role === "assistant"}
                />
              );
            })}

            {streaming && !messages.some(m => m.role === "assistant" && !m.tool_calls) && (
              <TypingIndicator iteration={thinkingIteration} />
            )}
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border-subtle bg-bg-surface-1">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="flex items-end gap-3 bg-bg-surface-2 border border-border-subtle rounded-xl px-4 py-3 transition-all duration-200 focus-within:border-accent-primary/40 focus-within:ring-1 focus-within:ring-accent-primary/20">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? "Agent is thinking..." : "Ask anything..."}
                disabled={streaming}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-text-primary placeholder:text-text-faint resize-none leading-relaxed min-h-[24px] max-h-[160px]"
                autoFocus
              />
              <button
                onClick={handleSend}
                disabled={streaming || !input.trim()}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-accent-primary text-white hover:bg-accent-primary-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-center mt-1.5">
              <span className="text-[10px] text-text-faint">Enter to send &middot; Shift+Enter for newline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
