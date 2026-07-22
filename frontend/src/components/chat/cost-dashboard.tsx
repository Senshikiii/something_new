"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

interface ThreadCost {
  thread_id: string;
  title: string;
  model: string;
  tokens_input: number;
  tokens_output: number;
  tokens_cache: number;
  cost: number;
}

interface CostSummary {
  threads: ThreadCost[];
  totals: {
    cost: number;
    tokens_input: number;
    tokens_output: number;
    tokens_cache: number;
  };
}

export function CostDashboard() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<CostSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => setLoading(true));
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      try {
        const res = await fetch(`${BACKEND_URL}/api/costs/summary`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error("Failed to load costs", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  function fmtCost(cost: number): string {
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  }

  function fmtTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-black hover:bg-[#fafafa] transition-colors"
          />
        }
      >
        Costs
      </DialogTrigger>
      <DialogContent className="bg-white border-[#eaeaea] text-black max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-black tracking-tight">
            Usage & Cost Breakdown
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-gray-400 text-xs animate-pulse">
            Loading...
          </div>
        ) : !data || data.threads.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            No usage data yet
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-[#eaeaea]">
                  <th className="text-left py-2 pr-3 font-medium">Thread</th>
                  <th className="text-left py-2 pr-3 font-medium">Model</th>
                  <th className="text-right py-2 pr-3 font-medium">In</th>
                  <th className="text-right py-2 pr-3 font-medium">Out</th>
                  <th className="text-right py-2 pr-3 font-medium">Cache</th>
                  <th className="text-right py-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.threads.map((t) => (
                  <tr
                    key={t.thread_id}
                    className="border-b border-[#eaeaea] hover:bg-[#fafafa] transition-colors"
                  >
                    <td className="py-1.5 pr-3 truncate max-w-[140px] text-black font-medium">
                      {t.title}
                    </td>
                    <td className="py-1.5 pr-3 text-gray-400 truncate max-w-[120px] font-mono">
                      {t.model}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-gray-600">
                      {fmtTokens(t.tokens_input)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-gray-600">
                      {fmtTokens(t.tokens_output)}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-gray-600">
                      {fmtTokens(t.tokens_cache)}
                    </td>
                    <td className="py-1.5 text-right text-black font-semibold">
                      {fmtCost(t.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black font-semibold">
                  <td colSpan={2} className="py-2 pr-3 text-gray-400">
                    Total
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-600">
                    {fmtTokens(data.totals.tokens_input)}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-600">
                    {fmtTokens(data.totals.tokens_output)}
                  </td>
                  <td className="py-2 pr-3 text-right text-gray-600">
                    {fmtTokens(data.totals.tokens_cache)}
                  </td>
                  <td className="py-2 text-right text-black">
                    {fmtCost(data.totals.cost)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
