import type { AppConfig, CostSummary, Conversation, ImageGenResponse, ProviderInfo, StreamEvent } from "../types";

const BASE = "/api";

export async function fetchConfig(): Promise<AppConfig> {
  const res = await fetch(`${BASE}/config`);
  return res.json();
}

export async function saveConfig(config: Partial<AppConfig>): Promise<AppConfig> {
  const res = await fetch(`${BASE}/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  return res.json();
}

export async function fetchProviders(): Promise<Record<string, ProviderInfo>> {
  const res = await fetch(`${BASE}/providers`);
  return res.json();
}

export async function fetchUsage(): Promise<CostSummary> {
  const res = await fetch(`${BASE}/usage`);
  return res.json();
}

export async function fetchHistories(search?: string): Promise<{ histories: Conversation[] }> {
  const url = search ? `${BASE}/history?search=${encodeURIComponent(search)}` : `${BASE}/history`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchHistory(id: string): Promise<Conversation> {
  const res = await fetch(`${BASE}/history/${id}`);
  if (!res.ok) throw new Error("History not found");
  return res.json();
}

export async function saveHistory(conv: {
  id?: string;
  title: string;
  model: string;
  messages: { role: string; content: string; reasoning_content?: string; image?: { base64: string; mimeType: string } }[];
}): Promise<{ id: string }> {
  const res = await fetch(`${BASE}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conv),
  });
  return res.json();
}

export async function deleteHistory(id: string): Promise<void> {
  await fetch(`${BASE}/history/${id}`, { method: "DELETE" });
}

export async function deleteAllHistories(): Promise<void> {
  await fetch(`${BASE}/history`, { method: "DELETE" });
}

export async function togglePin(id: string): Promise<{ id: string; pinned: boolean }> {
  const res = await fetch(`${BASE}/history/${id}/pin`, { method: "PATCH" });
  return res.json();
}

export function streamChat(
  body: {
    provider: string;
    apiKey?: string;
    model: string;
    messages: { role: string; content: string }[];
    apiKeys?: Record<string, string>;
    useAutoDetect: boolean;
    temperature: number;
    systemPrompt: string;
    maxTokens: number;
    maxRounds: number;
  },
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  return fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6)) as StreamEvent;
            onEvent(data);
            if (data.type === "error" || data.type === "done") return;
          } catch {}
        }
      }
    }
  });
}

export function streamVision(
  body: {
    deepseekApiKey?: string;
    qwenApiKey: string;
    deepseekModel?: string;
    qwenModel: string;
    provider?: string;
    apiKey?: string;
    apiKeys?: Record<string, string>;
    imageBase64: string;
    mimeType: string;
    userQuestion: string;
    messages: { role: string; content: string }[];
    useAutoDetect: boolean;
    temperature: number;
    maxTokens: number;
  },
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  return fetch(`${BASE}/vision/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6)) as StreamEvent;
            onEvent(data);
            if (data.type === "error" || data.type === "done") return;
          } catch {}
        }
      }
    }
  });
}

export async function generateImage(body: {
  apiKey: string;
  prompt: string;
  size?: string;
  n?: number;
}): Promise<ImageGenResponse> {
  const res = await fetch(`${BASE}/generate/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Image generation failed");
  }
  return res.json();
}
