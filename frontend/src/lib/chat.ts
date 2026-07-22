import { supabase } from "./supabase";
import { BACKEND_URL } from "./config";

async function authHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }
  return headers;
}

export function getSettings() {
  if (typeof window === "undefined") {
    return { apiKey: "", baseUrl: "https://api.openai.com/v1", model: "gpt-4o" };
  }
  return {
    apiKey: localStorage.getItem("micromanus_api_key") || "",
    baseUrl: localStorage.getItem("micromanus_base_url") || "https://api.openai.com/v1",
    model: localStorage.getItem("micromanus_model") || "gpt-4o",
  };
}

export function saveSettings(apiKey: string, baseUrl: string, model: string) {
  localStorage.setItem("micromanus_api_key", apiKey);
  localStorage.setItem("micromanus_base_url", baseUrl);
  localStorage.setItem("micromanus_model", model);
}

export interface Thread {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export async function listThreads(): Promise<Thread[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/chat/threads`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load threads");
  }
  return res.json();
}

export async function createThread(): Promise<any> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/chat/threads`, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.detail || "Failed to create thread");
  }
  return res.json();
}

export async function loadMessages(threadId: string): Promise<any[]> {
  const headers = await authHeaders();
  const res = await fetch(`${BACKEND_URL}/api/chat/threads/${threadId}/messages`, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to load messages");
  }
  return res.json();
}

export async function sendMessage(
  threadId: string,
  content: string,
  onEvent: (event: { type: string; [key: string]: any }) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const [settings, headers] = await Promise.all([getSettings(), authHeaders()]);
  const res = await fetch(`${BACKEND_URL}/api/chat/send`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      thread_id: threadId,
      content,
      api_key: settings.apiKey,
      base_url: settings.baseUrl,
      model: settings.model,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    onError(err.detail || "Request failed");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            data.type = eventType || data.type;
            onEvent(data);
          } catch {
            // ignore parse errors
          }
          eventType = "";
        }
      }
    }
  } catch (e: any) {
    onError(e.message || "Connection lost");
    return;
  }

  onDone();
}
