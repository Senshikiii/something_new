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
    setLoading(true);
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
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
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-[#928374] hover:text-[#d79921]">
          costs
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#282828] border-[#504945] text-[#ebdbb2] max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-[#d79921] font-mono text-sm">
            usage &amp; cost breakdown
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-[#928374] text-xs animate-pulse">loading...</div>
        ) : !data || data.threads.length === 0 ? (
          <div className="py-8 text-center text-[#928374] text-xs">no usage data yet</div>
        ) : (
          <div className="overflow-y-auto flex-1 -mx-6 px-6">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-[#928374] border-b border-[#504945]">
                  <th className="text-left py-2 pr-3">thread</th>
                  <th className="text-left py-2 pr-3">model</th>
                  <th className="text-right py-2 pr-3">in</th>
                  <th className="text-right py-2 pr-3">out</th>
                  <th className="text-right py-2 pr-3">cache</th>
                  <th className="text-right py-2">cost</th>
                </tr>
              </thead>
              <tbody>
                {data.threads.map((t) => (
                  <tr key={t.thread_id} className="border-b border-[#3c3836] hover:bg-[#32302f]">
                    <td className="py-1.5 pr-3 truncate max-w-[140px] text-[#ebdbb2]">{t.title}</td>
                    <td className="py-1.5 pr-3 text-[#928374] truncate max-w-[120px]">{t.model}</td>
                    <td className="py-1.5 pr-3 text-right text-[#b8bb26]">{fmtTokens(t.tokens_input)}</td>
                    <td className="py-1.5 pr-3 text-right text-[#fabd2f]">{fmtTokens(t.tokens_output)}</td>
                    <td className="py-1.5 pr-3 text-right text-[#83a598]">{fmtTokens(t.tokens_cache)}</td>
                    <td className="py-1.5 text-right text-[#d79921]">{fmtCost(t.cost)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#504945] font-bold">
                  <td colSpan={2} className="py-2 pr-3 text-[#928374]">total</td>
                  <td className="py-2 pr-3 text-right text-[#b8bb26]">{fmtTokens(data.totals.tokens_input)}</td>
                  <td className="py-2 pr-3 text-right text-[#fabd2f]">{fmtTokens(data.totals.tokens_output)}</td>
                  <td className="py-2 pr-3 text-right text-[#83a598]">{fmtTokens(data.totals.tokens_cache)}</td>
                  <td className="py-2 text-right text-[#d79921]">{fmtCost(data.totals.cost)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
