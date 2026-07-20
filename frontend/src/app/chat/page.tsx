"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { createThread, listThreads, loadMessages, sendMessage } from "@/lib/chat";

interface Message {
  id?: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: any[];
  tool_call_id?: string;
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
  const [creditBalance, setCreditBalance] = useState(0);
  const [showToolResult, setShowToolResult] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const streamMsgRef = useRef<StreamMsg | null>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, 50);
  }, []);

  // Init: create or load thread
  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const tid = params.get("thread_id");
      if (tid) {
        setThreadId(tid);
        const msgs = await loadMessages(tid);
        setMessages(msgs);
      } else {
        const thread = await createThread();
        setThreadId(thread.id);
        window.history.replaceState(null, "", `/chat?thread_id=${thread.id}`);
      }
    };
    init();
  }, []);

  // Check credits on thread change
  useEffect(() => {
    if (!threadId) return;
    (async () => {
      const userId = localStorage.getItem("micromanus_user_id");
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

  function handleNewChat() {
    setMessages([]);
    setStreaming(false);
    streamMsgRef.current = null;
    (async () => {
      const thread = await createThread();
      setThreadId(thread.id);
      window.history.replaceState(null, "", `/chat?thread_id=${thread.id}`);
      setCreditBalance((c) => c - 1);
    })();
  }

  async function handleSend() {
    if (!input.trim() || !threadId || streaming) return;

    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
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
          setShowToolResult((prev) => ({ ...prev }));
          scrollToBottom();
        } else if (event.type === "thinking") {
          // Brief thinking flash — shown inline, dismissed after a moment
        } else if (event.type === "usage") {
          // Store for cost tracking later
        }
      },
      () => {
        setStreaming(false);
        streamMsgRef.current = null;
        setCreditBalance((c) => Math.max(0, c - 1));
        scrollToBottom();
      },
      (err) => {
        setMessages((prev) => [...prev, { role: "assistant" as const, content: `Error: ${err}` }]);
        setStreaming(false);
        streamMsgRef.current = null;
      }
    );
  }

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3 text-sm">
          <span className="text-primary font-bold">MicroManus</span>
          <span className="text-muted-foreground">|</span>
          <span className="text-muted-foreground">credits: {creditBalance}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleNewChat} disabled={streaming}>
            + new chat
          </Button>
          <SettingsDialog />
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex gap-2 text-sm">
                <span className="text-green shrink-0">$</span>
                <span className="text-foreground whitespace-pre-wrap">{msg.content}</span>
              </div>
            );
          }
          if (msg.tool_calls) {
            return (
              <div key={i} className="ml-4 border border-border rounded px-3 py-2 text-xs text-muted-foreground">
                {msg.tool_calls.map((tc, j) => (
                  <div key={j} className="flex gap-2">
                    <span className="text-yellow">◆</span>
                    <span>
                      {tc.tool}
                      {tc.args ? `(${JSON.stringify(tc.args)})` : ""}
                    </span>
                  </div>
                ))}
              </div>
            );
          }
          if (msg.role === "assistant") {
            return (
              <div key={i} className="text-sm text-foreground whitespace-pre-wrap">
                {msg.content}
                {streaming && i === messages.length - 1 && (
                  <span className="animate-pulse text-primary">█</span>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          <span className="text-green shrink-0">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={streaming ? "agent is thinking..." : "ask anything..."}
            disabled={streaming}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground font-mono"
            autoFocus
          />
        </div>
      </div>
    </div>
  );
}
