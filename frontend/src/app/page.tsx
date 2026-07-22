"use client";

import { useState } from "react";
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

  async function handleGitHubSignIn() {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
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
      <div className="flex flex-1 flex-col items-center justify-center px-4 animate-fade-in">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold tracking-[-0.03em] text-black">
              MicroManus
            </h1>
            <p className="text-sm text-gray-500">
              You need credits to start researching.
            </p>
          </div>

          <div className="border border-[#eaeaea] rounded-xl p-6 space-y-5 bg-white">
            <div className="flex items-center justify-between px-4 py-3 bg-[#fafafa] rounded-lg border border-[#eaeaea]">
              <span className="text-sm text-gray-500">Credits available</span>
              <span className="text-sm font-semibold text-black">{credits}</span>
            </div>

            {error && (
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Coupon code
              </label>
              <Input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="SID_DRDROID"
                className="bg-white border-[#eaeaea] text-black placeholder:text-gray-300 rounded-lg"
              />
              <Button
                className="w-full bg-black text-white hover:bg-gray-800 rounded-lg transition-colors duration-200 font-medium"
                disabled={loading}
                onClick={handleRedeemCoupon}
              >
                {loading ? "Redeeming..." : "Redeem coupon"}
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#eaeaea]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2 text-gray-400">or</span>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full border-[#eaeaea] text-gray-500 hover:bg-[#fafafa] hover:text-gray-700 rounded-lg transition-colors duration-200 cursor-not-allowed"
              disabled
            >
              Pay with card — $5.00
            </Button>

            <p className="text-xs text-gray-400 text-center">
              Both paths grant exactly 5 credits
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-10 animate-fade-in">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold tracking-[-0.04em] text-black">
            MicroManus
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">
            Deep research AI. Bring your own key.
          </p>
        </div>

        <div className="border border-[#eaeaea] rounded-xl p-2 space-y-1 bg-white">
          <button
            className="w-full flex items-center justify-center gap-3 px-4 py-3 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors duration-200"
            disabled={loading}
            onClick={handleGitHubSignIn}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            {loading ? "Signing in..." : "Sign in with GitHub"}
          </button>

          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-[#fafafa] hover:text-black rounded-lg transition-colors duration-200"
            disabled={loading}
            onClick={handleGuestSignIn}
          >
            {loading ? "Signing in..." : "Continue as guest"}
          </button>

          {error && (
            <div className="mx-1 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Set your API key in settings after signing in
        </p>
      </div>
    </div>
  );
}
