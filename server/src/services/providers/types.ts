export type ProviderId = "deepseek" | "openai" | "anthropic" | "gemini";

export interface ModelInfo {
  id: string;
  name: string;
  pricing: { input: number; output: number; inputCacheHit?: number };
  reasoning?: boolean;
}

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  baseURL: string;
  envKeyName: string;
  models: ModelInfo[];
  defaultModel: string;
  type: "openai-compatible" | "anthropic";
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  temperature: number;
  maxTokens: number;
}

export interface ChatStreamResult {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheHitInputTokens: number;
}

export type StreamChunkCallback = (chunk: {
  type: "delta";
  content: string;
  reasoning: string;
}) => void;
