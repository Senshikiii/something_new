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
  { label: "Gemini 2.5 Flash", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.5-flash" },
  { label: "Gemini 2.5 Pro", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.5-pro" },
  { label: "Groq (Llama 3.3 70B)", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { label: "OpenAI (GPT-4o)", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  { label: "OpenAI (GPT-4o-mini)", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "Kimi (Moonshot)", baseUrl: "https://api.moonshot.cn/v1", model: "moonshot-v1-auto" },
];

export function SettingsDialog() {
  const [open, setOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");

  useEffect(() => {
    if (!open) return;
    const s = getSettings();
    queueMicrotask(() => {
      setApiKey(s.apiKey);
      setBaseUrl(s.baseUrl);
      setModel(s.model);
    });
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
      <DialogTrigger render={<Button variant="ghost" size="sm" className="text-xs text-text-muted hover:text-text-primary transition-colors" />}>
        Settings
      </DialogTrigger>
      <DialogContent className="bg-bg-surface-1 border-border-subtle max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-text-primary">Settings</DialogTitle>
          <DialogDescription className="text-sm text-text-muted">
            Configure your LLM API key and model.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label className="text-xs text-text-muted uppercase tracking-wide">Provider preset</Label>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(p)}
                  className={`text-xs border-border-subtle transition-all duration-150 ${
                    model === p.model
                      ? "bg-accent-primary-soft border-accent-primary/30 text-accent-primary"
                      : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
                  }`}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-muted uppercase tracking-wide">API endpoint</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="bg-bg-surface-2 border-border-subtle text-text-primary placeholder:text-text-faint font-mono text-xs rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-muted uppercase tracking-wide">Model</Label>
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="bg-bg-surface-2 border-border-subtle text-text-primary placeholder:text-text-faint font-mono text-xs rounded-lg"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-text-muted uppercase tracking-wide">API key</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-bg-surface-2 border-border-subtle text-text-primary placeholder:text-text-faint font-mono text-xs rounded-lg"
              placeholder="sk-..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSave}
            className="bg-accent-primary text-white hover:bg-accent-primary-hover rounded-lg transition-colors"
          >
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
