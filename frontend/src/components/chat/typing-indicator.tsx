"use client";

interface TypingIndicatorProps {
  iteration?: number;
  maxIterations?: number;
}

export function TypingIndicator({ iteration, maxIterations = 10 }: TypingIndicatorProps) {
  return (
    <div className="animate-slide-up flex gap-3 px-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-text-muted mb-1.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
          {iteration && (
            <span className="text-text-faint">
              [{iteration}/{maxIterations}]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
