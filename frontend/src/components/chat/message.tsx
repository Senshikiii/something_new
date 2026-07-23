"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { BACKEND_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";

const codeTheme = {
  ...oneLight,
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
  },
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
    background: "#fafafa",
    borderRadius: "6px",
    border: "1px solid #eaeaea",
    margin: "8px 0",
  },
};

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    const code = String(children).replace(/\n$/, "");
    if (language) {
      return (
        <div className="not-prose my-2 overflow-hidden rounded-lg border border-[#eaeaea] bg-[#fafafa]">
          <div className="flex items-center justify-between border-b border-[#eaeaea] px-3 py-1.5 text-xs text-gray-400">
            <span>{language}</span>
          </div>
          <SyntaxHighlighter
            style={codeTheme}
            language={language}
            PreTag="div"
            customStyle={{ margin: 0, border: "none", borderRadius: 0, background: "transparent" }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }
    return (
      <code
        className="rounded-md bg-[#f5f5f5] px-1.5 py-0.5 text-sm text-black font-mono"
        {...props}
      >
        {children}
      </code>
    );
  },
  pre({ children }) {
    return <>{children}</>;
  },
  p({ children }) {
    return <p className="leading-relaxed my-1.5 first:mt-0 last:mb-0">{children}</p>;
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="text-[#0070f3] underline underline-offset-2 hover:text-blue-600 transition-colors"
      >
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-gray-200 pl-3 my-2 text-gray-500 italic">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return <th className="border border-[#eaeaea] bg-[#fafafa] px-3 py-1.5 text-left font-semibold text-black">{children}</th>;
  },
  td({ children }) {
    return <td className="border border-[#eaeaea] px-3 py-1.5 text-gray-700">{children}</td>;
  },
};

interface MessageProps {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { tool?: string; name?: string; args?: any; arguments?: string }[];
  isStreaming?: boolean;
}

export function TerminalMessage({ role, content, tool_calls, isStreaming }: MessageProps) {
  const isUser = role === "user";

  let isPdfResult = false;
  let pdfId = "";
  let pdfTitle = "";
  try {
    const parsed = JSON.parse(content);
    if (parsed && parsed.status === "ready" && parsed.pdf_id) {
      isPdfResult = true;
      pdfId = parsed.pdf_id;
      pdfTitle = parsed.title || "Report";
    }
  } catch {}

  if (role === "tool" || (tool_calls && tool_calls.length > 0)) {
    return (
      <div className="animate-slide-up flex gap-3 ml-2">
        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="text-gray-300 text-xs">&#9670;</span>
          <div className="w-px flex-1 bg-[#eaeaea]" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {(tool_calls || []).map((tc, i) => {
            const toolName = tc.tool || (tc as any).function?.name || "tool";
            let argsStr = "";
            try {
              const raw = tc.args || (tc as any).function?.arguments || "";
              argsStr = typeof raw === "string" ? raw : JSON.stringify(raw);
            } catch {
              argsStr = "";
            }
            return (
              <div key={i} className="rounded-lg border border-[#eaeaea] bg-[#fafafa] px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-black font-semibold font-mono">{toolName}</span>
                  {toolName === "generate_pdf" && argsStr ? (
                    <span className="text-gray-400 truncate">Generate PDF report</span>
                  ) : (
                    argsStr && <span className="text-gray-400 truncate font-mono">{argsStr}</span>
                  )}
                </div>
                {content && isPdfResult && (
                  <div className="mt-2">
                    <button
                      onClick={async () => {
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session?.access_token) return;
                        try {
                          const res = await fetch(`${BACKEND_URL}/api/chat/pdf/${pdfId}`, {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                          });
                          if (!res.ok) throw new Error("Download failed");
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `micromanus-report-${pdfId.slice(0, 8)}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch {}
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#eaeaea] bg-white px-3 py-1.5 text-xs text-[#0070f3] hover:bg-[#fafafa] transition-colors"
                    >
                      <span>&#8595;</span>
                      <span>Download PDF — {pdfTitle}</span>
                    </button>
                  </div>
                )}
                {content && !isPdfResult && (
                  <div className="mt-1 text-xs text-gray-500 message-content [&_pre]:mt-1 [&_pre]:mb-0 [&_pre]:text-xs [&_pre]:p-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up flex gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
          <span className="font-medium">{isUser ? "You" : "MicroManus"}</span>
        </div>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? "bg-[#f5f5f5] border border-[#eaeaea]"
              : "bg-white border border-[#eaeaea]"
          }`}
        >
          <div className="message-content text-sm leading-relaxed text-black">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content || (isStreaming ? "" : "")}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-flex ml-0.5">
                <span className="w-1.5 h-4 bg-black animate-pulse rounded-sm" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
