"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Components } from "react-markdown";

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
    background: "#11111b",
    borderRadius: "6px",
    border: "1px solid #45475a",
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
        <div className="not-prose my-2 overflow-hidden rounded border border-border bg-[#11111b]">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5 text-xs text-muted-foreground">
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
        className="rounded bg-muted px-1.5 py-0.5 text-sm text-rose-400"
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
      <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2 hover:text-accent">
        {children}
      </a>
    );
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-primary pl-3 my-2 text-muted-foreground italic">
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
    return <th className="border border-border bg-muted px-3 py-1.5 text-left font-bold">{children}</th>;
  },
  td({ children }) {
    return <td className="border border-border px-3 py-1.5">{children}</td>;
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

  const borderColor = isUser ? "border-l-green" : "border-l-primary";
  const prefixColor = isUser ? "text-green" : "text-primary";

  if (role === "tool" || (tool_calls && tool_calls.length > 0)) {
    return (
      <div className="animate-slide-up flex gap-3 ml-2">
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <span className="text-yellow text-xs">◆</span>
          <div className="w-px flex-1 bg-border/50" />
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
              <div key={i} className="rounded border border-border/60 bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yellow font-medium">{toolName}</span>
                  {argsStr && (
                    <span className="text-muted-foreground truncate">{argsStr}</span>
                  )}
                </div>
                {content && (
                  <div className="mt-1 text-xs text-muted-foreground message-content [&_pre]:mt-1 [&_pre]:mb-0 [&_pre]:text-xs [&_pre]:p-2">
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
      <div
        className="w-0.5 shrink-0 rounded-full"
        style={{ backgroundColor: isUser ? "rgba(166, 227, 161, 0.5)" : "rgba(180, 190, 254, 0.5)" }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-0.5">
          <span className={prefixColor}>{isUser ? "$" : "⎔"}</span>
          <span>{isUser ? "you" : "assistant"}</span>
        </div>
        <div className="message-content text-sm leading-relaxed text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content || (isStreaming ? "" : "")}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-flex ml-0.5">
              <span className="w-2 h-4 bg-primary animate-pulse" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
