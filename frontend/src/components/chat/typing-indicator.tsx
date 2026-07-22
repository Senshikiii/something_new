"use client";

interface TypingIndicatorProps {
  iteration?: number;
  maxIterations?: number;
}

export function TypingIndicator({ iteration, maxIterations = 10 }: TypingIndicatorProps) {
  return (
    <div className="animate-slide-up flex gap-3 px-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-[bounce-dot_1.4s_ease-in-out_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-[bounce-dot_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="w-1.5 h-1.5 rounded-full bg-black animate-[bounce-dot_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
          {iteration && (
            <span className="text-gray-300 font-mono">
              [{iteration}/{maxIterations}]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
