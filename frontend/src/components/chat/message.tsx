"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";
import { BACKEND_URL } from "@/lib/config";

const codeTheme = {
  ...oneDark,
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
  },
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    fontFamily: "var(--font-mono)",
    fontSize: "0.8125rem",
    background: "#111113",
    borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.08)",
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
        <div className="not-prose my-2 overflow-hidden rounded-lg border border-border-subtle bg-bg-surface-1">
          <div className="flex items-center justify-between border-b border-border-subtle px-3 py-1.5 text-xs text-text-muted">
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
        className="rounded-md bg-bg-surface-3 px-1.5 py-0.5 text-sm text-accent-primary"
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
      <a href={href} target="_blank" rel="noreferrer" className="text-accent-primary underline underline-offset-2 hover:text-accent-primary-hover transition-colors">
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-accent-primary/40 pl-3 my-2 text-text-muted italic">
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
    return <th className="border border-border-subtle bg-bg-surface-2 px-3 py-1.5 text-left font-bold text-text-primary">{children}</th>;
  },
  td({ children }) {
    return <td className="border border-border-subtle px-3 py-1.5 text-text-secondary">{children}</td>;
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
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="text-accent-primary text-xs">&#9670;</span>
          <div className="w-px flex-1 bg-border-subtle" />
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
              <div key={i} className="rounded-lg border border-border-subtle bg-bg-surface-2 px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-accent-primary font-medium">{toolName}</span>
                  {toolName === "generate_pdf" && argsStr ? (
                    <span className="text-text-muted truncate">Generate PDF report</span>
                  ) : (
                    argsStr && <span className="text-text-muted truncate">{argsStr}</span>
                  )}
                </div>
                {content && isPdfResult && (
                  <div className="mt-2">
                    <a
                      href={`${BACKEND_URL}/api/chat/pdf/${pdfId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent-primary/20 bg-accent-primary-soft px-3 py-1.5 text-xs text-accent-primary hover:bg-accent-primary/20 transition-colors"
                    >
                      <span>&#8595;</span>
                      <span>Download PDF — {pdfTitle}</span>
                    </a>
                  </div>
                )}
                {content && !isPdfResult && (
                  <div className="mt-1 text-xs text-text-muted message-content [&_pre]:mt-1 [&_pre]:mb-0 [&_pre]:text-xs [&_pre]:p-2">
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
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1.5">
          <span className="text-text-faint">{isUser ? "" : ""}</span>
          <span>{isUser ? "You" : "Assistant"}</span>
        </div>
        <div className="rounded-xl px-4 py-3 bg-bg-surface-2 border border-border-subtle">
          <div className="message-content text-sm leading-relaxed text-text-primary">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content || (isStreaming ? "" : "")}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-flex ml-0.5">
                <span className="w-2 h-4 bg-accent-primary animate-pulse rounded-sm" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
