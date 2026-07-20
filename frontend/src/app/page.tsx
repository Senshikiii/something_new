"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function Home() {
  const [phase, setPhase] = useState<"landing" | "login" | "paywall">("landing");
  const [coupon, setCoupon] = useState("");
  const [credits] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(t);
  }, []);

  if (phase === "paywall") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="text-green">$</span>
              ./activate --credits
            </CardTitle>
            <CardDescription>
              You need credits to start researching. Choose your path.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded border border-border bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">credits available</span>
              <span className="font-bold text-foreground">{credits}</span>
            </div>

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
                onClick={() => {
                  if (coupon === "SID_DRDROID") {
                    alert("Coupon accepted! 5 credits granted.");
                  }
                }}
              >
                redeem coupon
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

            <Button variant="default" className="w-full">
              pay with card — $5.00
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              both paths grant exactly 5 credits
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
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
            onClick={() => (window.location.href = "/chat")}
          >
            <span className="text-muted-foreground">{">"}</span>
            continue as guest (dev)
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          set your API key in settings, then start chatting
        </p>
      </div>
    </div>
  );
}
