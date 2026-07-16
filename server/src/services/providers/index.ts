import { streamOpenAICompatible, applySlidingWindow } from "./openai-compatible.js";
import { streamAnthropic } from "./anthropic.js";
import { getProvider } from "./registry.js";
import type { ChatMessage, ChatOptions, ChatStreamResult, StreamChunkCallback, ProviderId } from "./types.js";

export { PROVIDERS, getProvider, getModelPricing, isThinkingModel, getProviderForModel } from "./registry.js";
export { applySlidingWindow } from "./openai-compatible.js";
export type { ChatMessage, ChatOptions, ChatStreamResult, StreamChunkCallback, ProviderId, ProviderInfo, ModelInfo } from "./types.js";

export async function streamChat(
  providerId: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
  onChunk: StreamChunkCallback,
  signal?: AbortSignal
): Promise<ChatStreamResult> {
  const provider = getProvider(providerId);
  if (!provider) {
    throw new Error(`Unknown provider: ${providerId}`);
  }

  if (provider.type === "openai-compatible") {
    return streamOpenAICompatible(providerId, apiKey, model, messages, options, onChunk, signal);
  }

  if (provider.type === "anthropic") {
    return streamAnthropic(apiKey, model, messages, options, onChunk, signal);
  }

  throw new Error(`Unsupported provider type: ${provider.type}`);
}

export function getProviderApiKey(providerId: string, configApiKeys: Record<string, string>): string {
  const provider = getProvider(providerId);
  if (!provider) return "";

  // 优先从环境变量获取
  const envKey = process.env[provider.envKeyName];
  if (envKey) return envKey;

  // 回退到用户配置
  return configApiKeys[providerId] || "";
}
