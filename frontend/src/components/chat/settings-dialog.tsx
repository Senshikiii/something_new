"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getSettings, saveSettings } from "@/lib/chat";

const PROVIDERS = [
  // Why: Gemini 2.5 Flash — free tier (no credit card), 30 RPM, fast, good at tool calling.
  // Best default for demo/testing. Endpoint is OpenAI-compatible.
  { label: "Gemini 2.5 Flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.5-flash" },
  // Why: Gemini 2.5 Pro — free tier, best reasoning, lower rate limits than Flash.
  { label: "Gemini 2.5 Pro", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.5-pro" },
  // Why: Groq — free tier, ultra-fast inference (~2600 tok/s), Llama 3.3 70B.
  // OpenAI-compatible endpoint. Great fallback if Gemini is slow.
  { label: "Groq (Llama 3.3 70B)", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  // Why: OpenAI — paid, but most users already have a key. GPT-4o is solid.
  { label: "OpenAI (GPT-4o)", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  // Why: Anthropic — paid, Claude Sonnet 4 is strong at long-form research.
  { label: "Anthropic (Claude)", baseUrl: "https://api.anthropic.com/v1", model: "claude-sonnet-4-20250514" },
  // Why: Kimi — Moonshot's API, cheaper than OpenAI/Anthropic but less reliable.
  { label: "Kimi (Moonshot)", baseUrl: "https://api.moonshot.cn/v1", model: "kimi-k3" },
];

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (open) {
      const s = getSettings();
      setApiKey(s.apiKey);
      setBaseUrl(s.baseUrl);
      setModel(s.model);
    }
  }, [open]);

  function applyPreset(preset: (typeof PROVIDERS)[number]) {
    setBaseUrl(preset.baseUrl);
    setModel(preset.model);
  }

  function handleSave() {
    saveSettings(apiKey, baseUrl, model);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        settings
      </DialogTrigger>
      <DialogContent className="font-mono">
        <DialogHeader>
          <DialogTitle className="text-base">$ ./configure</DialogTitle>
          <DialogDescription>Enter your LLM API key and model.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">provider preset</Label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="xs"
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">api endpoint</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">model</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input value={model} onChange={(e) => setModel(e.target.value)} className="font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">api key</Label>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">$</span>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
                placeholder="sk-..."
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
