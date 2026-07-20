"use client";

interface TypingIndicatorProps {
  iteration?: number;
  maxIterations?: number;
}

export function TypingIndicator({ iteration, maxIterations = 10 }: TypingIndicatorProps) {
  return (
    <div className="animate-slide-up flex gap-3">
      <div className="w-0.5 shrink-0 rounded-full bg-primary/40" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="text-primary">⎔</span>
          <span>assistant</span>
          {iteration && (
            <span className="text-muted-foreground/60">
              [{iteration}/{maxIterations}]
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span>thinking</span>
          <span className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
          </span>
        </div>
      </div>
    </div>
  );
}
