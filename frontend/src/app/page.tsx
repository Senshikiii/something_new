"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { PixelCat, PixelWhale } from "@/components/chat/pixel-art";
import { BootSequence } from "@/components/chat/boot-sequence";
import { BACKEND_URL } from "@/lib/config";

export default function Home() {
  const [bootComplete, setBootComplete] = useState(false);
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
      const res = await fetch(`${BACKEND_URL}/api/paywall/redeem-coupon`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code: coupon.trim() }),
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

  const bootSteps = [
    {
      label: "Power-on self-test",
      action: async () => "OK",
    },
    {
      label: "Loading system modules",
      action: async () => "all subsystems present",
    },
    {
      label: "Checking session",
      action: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id ? "active" : "none (guest mode)";
      },
    },
    {
      label: "Connecting to research backend",
      action: async () => {
        const res = await fetch(`${BACKEND_URL}/api/health`);
        const data = await res.json();
        return data.status;
      },
    },
    {
      label: "Initializing agent environment",
      action: async () => "ready",
    },
  ];

  if (!bootComplete) {
    return <BootSequence steps={bootSteps} onComplete={() => setBootComplete(true)} minDurationMs={3500} />;
  }

  if (phase === "paywall") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4 relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute animate-[float-drift_8s_ease-in-out_infinite]" style={{ top: "15%", left: "8%", opacity: 0.12 }}>
            <PixelCat color="#d79921" size={4} />
          </div>
          <div className="absolute animate-[float-drift-slow_12s_ease-in-out_infinite]" style={{ top: "50%", right: "5%", opacity: 0.1 }}>
            <PixelWhale color="#458588" size={4} />
          </div>
        </div>

        <div className="w-full max-w-md flex flex-col border-2 border-border/80 bg-background shadow-[8px_8px_0px_rgba(29,32,33,0.8)] z-10">
          <div className="flex items-center border-b-2 border-border/80 bg-[#3c3836] px-3 py-1.5 select-none">
            <div className="flex items-center gap-2 text-xs text-[#928374] font-bold tracking-wide">
              <span className="text-[#98971a]">●</span>
              <span>MICROMANUS</span>
              <span className="text-[#504945]">|</span>
              <span className="font-normal text-[#928374]">~/activate</span>
            </div>
          </div>
          <div className="p-4 sm:p-6 bg-[#1d2021]">
            <Card className="w-full border-0 shadow-none bg-transparent">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2 text-base text-[#ebdbb2]">
                  <span className="text-[#98971a]">$</span>
                  ./activate --credits
                </CardTitle>
                <CardDescription className="text-[#928374]">
                  You need credits to start researching. Choose your path.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-0 flex flex-col gap-4">
                <div className="flex items-center justify-between border-2 border-border bg-[#282828] px-3 py-2 text-sm">
                  <span className="text-[#928374]">credits available</span>
                  <span className="font-bold text-[#ebdbb2]">{credits}</span>
                </div>

                {error && (
                  <div className="border-2 border-[#cc241d]/50 bg-[#cc241d]/10 px-3 py-2 text-xs text-[#cc241d]">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs text-[#928374]">enter coupon code</label>
                  <div className="flex gap-2">
                    <span className="flex items-center text-[#928374]">$</span>
                    <Input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="SID_DRDROID"
                      className="font-mono bg-[#282828] border-2 border-border text-[#ebdbb2] placeholder:text-[#504945]"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-2 border-border text-[#ebdbb2] hover:bg-[#3c3836] hover:text-[#ebdbb2]"
                    disabled={loading}
                    onClick={handleRedeemCoupon}
                  >
                    {loading ? "redeeming..." : "redeem coupon"}
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t-2 border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#1d2021] px-2 text-[#504945]">or</span>
                  </div>
                </div>

                <Button variant="default" className="w-full bg-[#458588] text-[#ebdbb2] hover:bg-[#689d6a] border-2 border-[#458588] shadow-none" disabled>
                  pay with card — $5.00
                </Button>

                <p className="text-xs text-[#504945] text-center">
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
    <div className="flex flex-1 flex-col items-center justify-center p-3 sm:p-4 relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute animate-[float-drift_8s_ease-in-out_infinite]" style={{ top: "10%", left: "6%", opacity: 0.15 }}>
          <PixelCat color="#d79921" size={4} />
        </div>
        <div className="absolute animate-[float-drift-slow_12s_ease-in-out_infinite]" style={{ top: "55%", right: "8%", opacity: 0.12 }}>
          <PixelWhale color="#458588" size={4} />
        </div>
        <div className="absolute animate-[float-drift_10s_ease-in-out_infinite_reverse]" style={{ bottom: "15%", left: "12%", opacity: 0.08 }}>
          <PixelWhale color="#b16286" size={3} />
        </div>
      </div>

      <div className="w-full max-w-lg flex flex-col border-2 border-border/80 bg-background shadow-[8px_8px_0px_rgba(29,32,33,0.8)] z-10">
        <div className="flex items-center border-b-2 border-border/80 bg-[#3c3836] px-3 py-1.5 select-none">
          <div className="flex items-center gap-2 text-xs text-[#928374] font-bold tracking-wide">
            <span className="text-[#98971a]">●</span>
            <span>MICROMANUS</span>
            <span className="text-[#504945]">|</span>
            <span className="font-normal text-[#928374]">~/start</span>
          </div>
        </div>
        <div className="p-6 sm:p-8 bg-[#1d2021]">
          <div className="w-full space-y-8">
            <div className="space-y-2 text-center">
              <pre className="text-xs sm:text-sm leading-relaxed text-[#458588] select-none">
{`  __  __ _                _____                _
 |  \\/  (_) ___ ___ ___  |  ___|__ _ __  _   _| |_ ___
 | |\\/| | |/ __/ __/ __| | |_ / _ \\ '_ \\| | | | __/ _ \\
 | |  | | | (__|__ \\__ \\ |  _|  __/ | | | |_| | |_  __/
 |_|  |_|_|\\___|___/___/ |_|  \\___|_| |_|\\__,_|\\__\\___|`}
              </pre>
              <p className="text-xs text-[#928374]">
                deep research agent — bring your own API key
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm text-[#928374]">
              <span className="text-[#d79921]">$</span>
              <span>./start.sh</span>
              <span className="animate-pulse">{cursor ? "█" : " "}</span>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 font-normal border-2 border-border text-[#ebdbb2] hover:bg-[#3c3836] hover:text-[#ebdbb2]"
                disabled={loading}
                onClick={handleGuestSignIn}
              >
                <span className="text-[#928374]">{">"}</span>
                {loading ? "signing in..." : "continue as guest (dev)"}
              </Button>

              {error && (
                <div className="border-2 border-[#cc241d]/50 bg-[#cc241d]/10 px-3 py-2 text-xs text-[#cc241d]">
                  {error}
                </div>
              )}
            </div>

            <p className="text-xs text-[#504945] text-center leading-relaxed">
              set your API key in settings, then start chatting
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
