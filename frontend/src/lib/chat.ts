const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("micromanus_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("micromanus_user_id", id);
  }
  return id;
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

export async function listThreads(): Promise<any[]> {
  const res = await fetch(`${BACKEND}/api/chat/threads?user_id=${getUserId()}`);
  return res.json();
}

export async function createThread(): Promise<any> {
  const res = await fetch(`${BACKEND}/api/chat/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: getUserId() }),
  });
  return res.json();
}

export async function loadMessages(threadId: string): Promise<any[]> {
  const res = await fetch(`${BACKEND}/api/chat/threads/${threadId}/messages`);
  return res.json();
}

export async function sendMessage(
  threadId: string,
  content: string,
  onEvent: (event: { type: string; [key: string]: any }) => void,
  onDone: () => void,
  onError: (err: string) => void,
) {
  const settings = getSettings();
  const res = await fetch(`${BACKEND}/api/chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      thread_id: threadId,
      user_id: getUserId(),
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

  onDone();
}
