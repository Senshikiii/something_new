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

  async function handleOAuthSignIn(provider: "github" | "google") {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
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
                className="w-full justify-start gap-3 font-normal border-2 border-[#504945] text-[#ebdbb2] hover:bg-[#3c3836] hover:text-[#ebdbb2]"
                disabled={loading}
                onClick={() => handleOAuthSignIn("github")}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                {loading ? "signing in..." : "sign in with github"}
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 font-normal border-2 border-[#504945] text-[#ebdbb2] hover:bg-[#3c3836] hover:text-[#ebdbb2]"
                disabled={loading}
                onClick={() => handleOAuthSignIn("google")}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                {loading ? "signing in..." : "sign in with google"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t-2 border-[#504945]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#1d2021] px-2 text-[#504945]">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full justify-start gap-3 font-normal border-2 border-border text-[#928374] hover:bg-[#3c3836] hover:text-[#ebdbb2]"
                disabled={loading}
                onClick={handleGuestSignIn}
              >
                <span className="text-[#504945]">{">"}</span>
                {loading ? "signing in..." : "continue as guest"}
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
