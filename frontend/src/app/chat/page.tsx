"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { TerminalMessage } from "@/components/chat/message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { supabase } from "@/lib/supabase";
import { createThread, loadMessages, sendMessage, getSettings } from "@/lib/chat";

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
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinkingIteration, setThinkingIteration] = useState<number | undefined>();
  const [creditBalance, setCreditBalance] = useState(0);
  const [modelName, setModelName] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const streamMsgRef = useRef<StreamMsg | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  // Init: create or load thread
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
        const msgs = await loadMessages(tid);
        setMessages(msgs);
      } else {
        try {
          const thread = await createThread();
          setThreadId(thread.id);
          window.history.replaceState(null, "", `/chat?thread_id=${thread.id}`);
        } catch (e: any) {
          setMessages([{ role: "assistant", content: `Failed to create thread: ${e.message}` }]);
        }
      }
    };
    init();
  }, []);

  // Check credits on thread change
  useEffect(() => {
    if (!threadId) return;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/credits/balance/${userId}`
        );
        const data = await res.json();
        setCreditBalance(data.credits ?? 0);
      } catch {}
    })();
  }, [threadId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Update model name on settings change
  useEffect(() => {
    const s = getSettings();
    setModelName(s.model);
  }, []);

  // Auto-resize textarea
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
        window.history.replaceState(null, "", `/chat?thread_id=${thread.id}`);
      } catch (e: any) {
        setMessages([{ role: "assistant", content: `Failed to create thread: ${e.message}` }]);
      }
    })();
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
          if (session?.user?.id) {
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/credits/balance/${session.user.id}`
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

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-4xl h-full flex flex-col rounded-lg border border-border/80 bg-background shadow-lg overflow-hidden">
        {/* Terminal Title Bar */}
        <div className="flex items-center gap-2 border-b border-border/80 bg-card/50 px-3 py-2.5 select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors cursor-pointer" onClick={handleLogout} title="Logout" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground/60 font-medium tracking-wide">
              micromanus — ~/chat
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground/40">
            <span className="hidden sm:inline">{creditBalance} credits</span>
            <span className="hidden sm:inline mx-1">|</span>
            <span className="hidden sm:inline truncate max-w-24">{modelName}</span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-1.5 bg-muted/10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green" />
            <span className="hidden sm:inline">{creditBalance} credits</span>
            {modelName && (
              <>
                <span className="hidden sm:inline">|</span>
                <span className="hidden sm:inline">{modelName}</span>
              </>
            )}
            {threadId && (
              <>
                <span>|</span>
                <span className="truncate max-w-32">{threadId.slice(0, 8)}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleNewChat} disabled={streaming}>
              + new
            </Button>
            <SettingsDialog />
          </div>
        </div>

        {/* Messages area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/5">
          <div className="mx-auto max-w-3xl px-3 sm:px-4 py-5 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
                <pre className="text-xs text-muted-foreground/20 select-none mb-6 leading-relaxed">
{`  __  __ _                _____                _
 |  \\/  (_) ___ ___ ___  |  ___|__ _ __  _   _| |_ ___
 | |\\/| | |/ __/ __/ __| | |_ / _ \\ '_ \\| | | | __/ _ \\
 | |  | | | (__|__ \\__ \\ |  _|  __/ | | | |_| | |_  __/
 |_|  |_|_|\\___|___/___/ |_|  \\___|_| |_|\\__,_|\\__\\___|`}
                </pre>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground/40">
                    research agent ready —
                  </p>
                  <p className="text-xs text-muted-foreground/30">
                    set your API key in settings, then ask anything
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              if (msg.role === "tool") {
                return null;
              }
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

        {/* Input area */}
        <div className="border-t border-border/60 bg-card/30">
          <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3">
            <div className="relative flex items-start gap-3 rounded-lg border border-border bg-muted/10 px-3 py-2 transition-all duration-200 focus-within:border-primary/30 focus-within:bg-muted/20 focus-within:shadow-[0_0_0_3px_rgba(180,190,254,0.06)]">
              <span className="text-green shrink-0 mt-1.5 text-sm select-none">$</span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? "agent is thinking..." : "ask anything..."}
                disabled={streaming}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/30 font-mono resize-none leading-relaxed"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[10px] text-muted-foreground/25">
                Enter to send · Shift+Enter for newline
              </span>
              <span className="text-[10px] text-muted-foreground/25">
                {input.length > 0 ? `${input.length} chars` : ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
