"use client";

import { useState, useEffect, useRef } from "react";
import { PixelCat } from "./pixel-art";

interface BootStep {
  label: string;
  action: () => Promise<string | void>;
}

interface BootSequenceProps {
  steps: BootStep[];
  onComplete: () => void;
  minDurationMs?: number;
}

type BootState = { label: string; status: string; detail?: string };

export function BootSequence({ steps, onComplete, minDurationMs = 0 }: BootSequenceProps) {
  const [states, setStates] = useState<BootState[]>(steps.map((s) => ({ label: s.label, status: "pending" })));
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const minDurRef = useRef(minDurationMs);
  minDurRef.current = minDurationMs;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    startedAt.current = Date.now();
    let cancelled = false;

    const runStep = async (i: number) => {
      if (cancelled) return;
      const currentSteps = stepsRef.current;
      if (i >= currentSteps.length) {
        const elapsed = Date.now() - startedAt.current;
        const remaining = Math.max(0, minDurRef.current - elapsed);
        if (remaining > 0 && !cancelled) {
          await new Promise((r) => setTimeout(r, remaining));
        }
        if (!cancelled) setFinished(true);
        return;
      }
      setStates((prev) => {
        const copy = prev.map((s) => ({ ...s }));
        copy[i] = { ...copy[i], status: "running" };
        return copy;
      });
      try {
        const result = await currentSteps[i].action();
        if (cancelled) return;
        setStates((prev) => {
          const copy = prev.map((s) => ({ ...s }));
          copy[i] = { ...copy[i], status: "ok", detail: result || undefined };
          return copy;
        });
      } catch (e: any) {
        if (cancelled) return;
        setStates((prev) => {
          const copy = prev.map((s) => ({ ...s }));
          copy[i] = { ...copy[i], status: "fail", detail: e.message };
          return copy;
        });
      }
      runStep(i + 1);
    };

    runStep(0);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!finished) return;
    const t = setTimeout(() => onCompleteRef.current(), 600);
    return () => clearTimeout(t);
  }, [finished]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1d2021] px-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6 text-[#928374] text-xs tracking-wide">
          <PixelCat color="#d79921" size={3} />
          <span>MICROMANUS v0.1</span>
        </div>

        <pre className="text-[#504945] text-xs mb-4 select-none leading-relaxed">
{`  __  __ _                _____                _
 |  \\/  (_) ___ ___ ___  |  ___|__ _ __  _   _| |_ ___
 | |\\/| | |/ __/ __/ __| | |_ / _ \\ '_ \\| | | | __/ _ \\
 | |  | | | (__|__ \\__ \\ |  _|  __/ | | | |_| | |_  __/
 |_|  |_|_|\\___|___/___/ |_|  \\___|_| |_|\\__,_|\\__\\___|`}
        </pre>

        <div className="border-2 border-border bg-[#282828] p-4 font-mono text-xs space-y-1.5">
          {states.map((s, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 transition-opacity duration-300 ${
                s.status === "pending" ? "opacity-30" : "opacity-100"
              }`}
            >
              <span className="shrink-0 w-12 text-right">
                {s.status === "pending" && <span className="text-[#504945]">[    ]</span>}
                {s.status === "running" && <span className="text-[#d79921] animate-pulse">[ .. ]</span>}
                {s.status === "ok" && <span className="text-[#98971a]">[ OK ]</span>}
                {s.status === "fail" && <span className="text-[#cc241d]">[FAIL]</span>}
              </span>
              <span className="text-[#ebdbb2]">{s.label}</span>
              {s.detail && s.status === "ok" && (
                <span className="text-[#504945] truncate">— {s.detail}</span>
              )}
              {s.detail && s.status === "fail" && (
                <span className="text-[#cc241d] truncate">— {s.detail}</span>
              )}
            </div>
          ))}

          {finished && (
            <div className="text-[#504945] mt-3 animate-pulse">
              Press any key or wait...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
