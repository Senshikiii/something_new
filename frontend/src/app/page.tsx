"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export default function Home() {
  const [phase, setPhase] = useState<"landing" | "login" | "paywall">("landing");
  const [coupon, setCoupon] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(t);
  }, []);

  async function handleGuestSignIn() {
    setLoading(true);
    setError("");
    const { data, error: signInError } = await supabase.auth.signInAnonymously();
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setPhase("paywall");
  }

  async function handleRedeemCoupon() {
    if (!coupon.trim()) return;
    setLoading(true);
    setError("");
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      setError("Not signed in");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${BACKEND}/api/paywall/redeem-coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: session.user.id, code: coupon.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Invalid coupon");
        setLoading(false);
        return;
      }
      setCredits(data.credits);
      setTimeout(() => {
        window.location.href = "/chat";
      }, 800);
    } catch {
      setError("Failed to connect to server");
      setLoading(false);
    }
  }

  if (phase === "paywall") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4">
        <div className="w-full max-w-lg h-auto flex flex-col rounded-lg border border-border/80 bg-background shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/80 bg-card/50 px-3 py-2.5 select-none">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-muted-foreground/60 font-medium tracking-wide">
                micromanus — ~/activate
              </span>
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className="text-green">$</span>
                  ./activate --credits
                </CardTitle>
                <CardDescription>
                  You need credits to start researching. Choose your path.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex flex-col gap-4">
                <div className="flex items-center justify-between rounded border border-border bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">credits available</span>
                  <span className="font-bold text-foreground">{credits}</span>
                </div>

                {error && (
                  <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">enter coupon code</label>
                  <div className="flex gap-2">
                    <span className="flex items-center text-muted-foreground">$</span>
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="XXXX-XXXX"
                      className="font-mono"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={loading}
                    onClick={handleRedeemCoupon}
                  >
                    {loading ? "redeeming..." : "redeem coupon"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button variant="default" className="w-full" disabled>
                  pay with card — $5.00
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  both paths grant exactly 5 credits
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-lg h-auto flex flex-col rounded-lg border border-border/80 bg-background shadow-lg overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border/80 bg-card/50 px-3 py-2.5 select-none">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 text-center">
            <span className="text-xs text-muted-foreground/60 font-medium tracking-wide">
              micromanus — ~/start
            </span>
          </div>
        </div>
        <div className="p-6 sm:p-8">
          <div className="max-w-lg w-full space-y-8">
            <div className="space-y-2 text-center">
              <pre className="text-xs sm:text-sm leading-relaxed text-primary select-none">
{`  __  __ _                _____                _\n |  \\/  (_) ___ ___ ___  |  ___|__ _ __  _   _| |_ ___\n | |\\/| | |/ __/ __/ __| | |_ / _ \\ '_ \\| | | | __/ _ \\\n | |  | | | (__|__ \\__ \\ |  _|  __/ | | | |_| | |_  __/\n |_|  |_|_|\\___|___/___/ |_|  \\___|_| |_|\\__,_|\\__\\___|`}
              </pre>
              <p className="text-xs text-muted-foreground">
                deep research agent &mdash; bring your own API key
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="text-primary">$</span>
              <span>./start.sh</span>
              <span className="animate-pulse">{cursor ? "█" : " "}</span>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 font-normal"
                disabled={loading}
                onClick={handleGuestSignIn}
              >
                <span className="text-muted-foreground">{">"}</span>
                {loading ? "signing in..." : "continue as guest (dev)"}
              </Button>

              {error && (
                <div className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              set your API key in settings, then start chatting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
