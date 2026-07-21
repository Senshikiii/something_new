"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/chat/settings-dialog";
import { TerminalMessage } from "@/components/chat/message";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { PixelCat, PixelWhale, PixelStar, WalkingCat } from "@/components/chat/pixel-art";
import { supabase } from "@/lib/supabase";
import { createThread, loadMessages, sendMessage, getSettings } from "@/lib/chat";
import { BACKEND_URL } from "@/lib/config";

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
      <div className="flex flex-1 items-center justify-center bg-[#1d2021]">
        <div className="text-xs text-[#504945] animate-pulse">loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-2 sm:p-3 relative">
      {/* Background decorations */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute animate-[float-drift_8s_ease-in-out_infinite]" style={{ top: "12%", left: "5%", opacity: 0.15 }}>
          <PixelCat color="#d79921" size={4} />
        </div>
        <div className="absolute animate-[float-drift-slow_12s_ease-in-out_infinite]" style={{ top: "60%", right: "6%", opacity: 0.12 }}>
          <PixelWhale color="#458588" size={4} />
        </div>
        <div className="absolute animate-[float-drift_10s_ease-in-out_infinite_reverse]" style={{ top: "30%", right: "15%", opacity: 0.08 }}>
          <PixelCat color="#98971a" size={3} />
        </div>
        <div className="absolute animate-[float-drift-slow_15s_ease-in-out_infinite]" style={{ bottom: "20%", left: "10%", opacity: 0.1 }}>
          <PixelWhale color="#b16286" size={3} />
        </div>
        <div className="absolute animate-[float-drift_14s_ease-in-out_infinite]" style={{ top: "45%", left: "50%", opacity: 0.06 }}>
          <PixelStar color="#d65d0e" size={3} />
        </div>
        <div className="absolute animate-[float-drift_9s_ease-in-out_infinite_reverse]" style={{ top: "75%", right: "25%", opacity: 0.05 }}>
          <PixelStar color="#fabd2f" size={2} />
        </div>
        <WalkingCat className="fixed bottom-0 left-0 z-0" />
      </div>

      <div className="w-full max-w-4xl h-full flex flex-col border-2 border-border/80 bg-background shadow-[8px_8px_0px_rgba(29,32,33,0.8)] z-10">
        {/* Retro terminal title bar */}
        <div className="flex items-center border-b-2 border-border/80 bg-[#3c3836] px-3 py-1.5 select-none">
          <div className="flex items-center gap-2 text-xs text-[#928374] font-bold tracking-wide">
            <PixelCat color="#d79921" size={2} />
            <span>MICROMANUS</span>
            <span className="text-[#504945]">|</span>
            <span className="font-normal text-[#928374]">~/chat</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={handleLogout}
            className="text-[#928374] hover:text-[#cc241d] text-xs transition-colors tracking-wide"
          >
            [exit]
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-1 bg-[#32302f]">
          <div className="flex items-center gap-2 text-xs text-[#928374]">
            <span className="text-[#98971a]">{creditBalance}c</span>
            {modelName && (
              <>
                <span className="text-[#504945]">|</span>
                <span className="truncate max-w-24">{modelName}</span>
              </>
            )}
            {threadId && (
              <>
                <span className="text-[#504945]">|</span>
                <span className="text-[#504945]">#{threadId.slice(0, 6)}</span>
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

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-[#1d2021]">
          <div className="mx-auto max-w-3xl px-3 sm:px-4 py-5 space-y-3">
            {messages.length === 0 && !streaming && (
              <div className="animate-fade-in flex flex-col items-center justify-center py-20 text-center">
                <pre className="text-xs text-[#504945] select-none mb-6 leading-relaxed">
{`  __  __ _                _____                _
 |  \\/  (_) ___ ___ ___  |  ___|__ _ __  _   _| |_ ___
 | |\\/| | |/ __/ __/ __| | |_ / _ \\ '_ \\| | | | __/ _ \\
 | |  | | | (__|__ \\__ \\ |  _|  __/ | | | |_| | |_  __/
 |_|  |_|_|\\___|___/___/ |_|  \\___|_| |_|\\__,_|\\__\\___|`}
                </pre>
                <div className="space-y-1">
                  <p className="text-xs text-[#928374]">research agent ready —</p>
                  <p className="text-xs text-[#504945]">set API key in settings, then ask anything</p>
                </div>
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
        <div className="border-t-2 border-border/60 bg-[#32302f]">
          <div className="mx-auto max-w-3xl px-3 sm:px-4 py-3">
            <div className="flex items-start gap-2 border-2 border-border bg-[#1d2021] px-3 py-2 transition-colors duration-200 focus-within:border-[#458588]">
              <span className="text-[#98971a] shrink-0 mt-1.5 text-sm select-none">$</span>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={streaming ? "agent is thinking..." : "ask anything..."}
                disabled={streaming}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-sm text-[#ebdbb2] placeholder:text-[#504945] font-mono resize-none leading-relaxed"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-between mt-1.5 px-1">
              <span className="text-[10px] text-[#504945]">RET to send · ^J newline</span>
              <button
                onClick={handleLogout}
                className="text-[10px] text-[#504945] hover:text-[#cc241d] transition-colors"
              >
                logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
