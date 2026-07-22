"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { BACKEND_URL } from "@/lib/config";

export default function Home() {
  const [phase, setPhase] = useState<"landing" | "paywall">("landing");
  const [coupon, setCoupon] = useState("");
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGuestSignIn() {
    setLoading(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInAnonymously();
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

  if (phase === "paywall") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4 animate-fade-in">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">MicroManus</h1>
            <p className="text-sm text-text-secondary">You need credits to start researching.</p>
          </div>

          <div className="bg-bg-surface-1 border border-border-subtle rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between px-3 py-2.5 bg-bg-surface-2 rounded-lg">
              <span className="text-sm text-text-muted">Credits available</span>
              <span className="text-sm font-medium text-text-primary">{credits}</span>
            </div>

            {error && (
              <div className="px-3 py-2 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Coupon code</label>
              <Input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="SID_DRDROID"
                className="bg-bg-surface-2 border-border-default text-text-primary placeholder:text-text-faint rounded-lg"
              />
              <Button
                className="w-full bg-accent-primary text-white hover:bg-accent-primary-hover rounded-lg transition-colors duration-200"
                disabled={loading}
                onClick={handleRedeemCoupon}
              >
                {loading ? "Redeeming..." : "Redeem coupon"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-bg-surface-1 px-2 text-text-faint">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-border-default text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary rounded-lg transition-colors duration-200"
              disabled
            >
              Pay with card — $5.00
            </Button>

            <p className="text-xs text-text-faint text-center">Both paths grant exactly 5 credits</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-10 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-accent-primary to-purple-400 bg-clip-text text-transparent">
              MicroManus
            </span>
          </h1>
          <p className="text-base text-text-secondary max-w-sm mx-auto leading-relaxed">
            Deep research AI agent. Bring your own API key.
          </p>
        </div>

        <div className="bg-bg-surface-1 border border-border-subtle rounded-xl p-6 space-y-4">
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-border-default text-text-primary hover:bg-bg-surface-2 rounded-lg transition-colors duration-200"
              disabled={loading}
              onClick={() => handleOAuthSignIn("github")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              {loading ? "Signing in..." : "Sign in with GitHub"}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-border-default text-text-primary hover:bg-bg-surface-2 rounded-lg transition-colors duration-200"
              disabled={loading}
              onClick={() => handleOAuthSignIn("google")}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {loading ? "Signing in..." : "Sign in with Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border-subtle" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-bg-surface-1 px-2 text-text-faint">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 border-border-default text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary rounded-lg transition-colors duration-200"
              disabled={loading}
              onClick={handleGuestSignIn}
            >
              <span className="text-text-muted">{'>'}</span>
              {loading ? "Signing in..." : "Continue as guest"}
            </Button>

            {error && (
              <div className="px-3 py-2 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-sm text-accent-danger">
                {error}
              </div>
            )}
          </div>

          <p className="text-xs text-text-faint text-center leading-relaxed">
            Set your API key in settings, then start chatting
          </p>
        </div>
      </div>
    </div>
  );
}
