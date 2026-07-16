import type { ProviderInfo } from "./types.js";

export const PROVIDERS: Record<string, ProviderInfo> = {
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    envKeyName: "DEEPSEEK_API_KEY",
    type: "openai-compatible",
    defaultModel: "deepseek-v4-pro",
    models: [
      { id: "deepseek-v4-pro", name: "V4 Pro (深度思考)", pricing: { input: 0.55, output: 2.19 }, reasoning: true },
      { id: "deepseek-v4-flash", name: "V4 Flash (极速版)", pricing: { input: 0.14, output: 0.55 } },
      { id: "deepseek-chat", name: "Chat", pricing: { input: 0.14, output: 0.28 } },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    baseURL: "https://api.openai.com/v1",
    envKeyName: "OPENAI_API_KEY",
    type: "openai-compatible",
    defaultModel: "gpt-4.1",
    models: [
      { id: "gpt-4.1", name: "GPT-4.1", pricing: { input: 2.5, output: 10.0 } },
      { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", pricing: { input: 0.4, output: 1.6 } },
      { id: "gpt-4o", name: "GPT-4o", pricing: { input: 2.5, output: 10.0 } },
      { id: "gpt-4o-mini", name: "GPT-4o Mini", pricing: { input: 0.15, output: 0.6 } },
      { id: "o3", name: "o3 (推理)", pricing: { input: 10.0, output: 40.0 } },
      { id: "o4-mini", name: "o4-mini (推理)", pricing: { input: 1.1, output: 4.4 } },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    baseURL: "https://api.anthropic.com",
    envKeyName: "ANTHROPIC_API_KEY",
    type: "anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", pricing: { input: 3.0, output: 15.0 } },
      { id: "claude-opus-4-20250514", name: "Claude Opus 4", pricing: { input: 15.0, output: 75.0 } },
      { id: "claude-3.5-sonnet", name: "Claude 3.5 Sonnet", pricing: { input: 3.0, output: 15.0 } },
      { id: "claude-3.5-haiku", name: "Claude 3.5 Haiku", pricing: { input: 0.8, output: 4.0 } },
    ],
  },
};

export function getProvider(id: string): ProviderInfo | undefined {
  return PROVIDERS[id];
}

export function getModelPricing(modelId: string): { input: number; output: number } | null {
  for (const provider of Object.values(PROVIDERS)) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model) return model.pricing;
  }
  return null;
}

export function isThinkingModel(modelId: string): boolean {
  for (const provider of Object.values(PROVIDERS)) {
    const model = provider.models.find((m) => m.id === modelId);
    if (model?.reasoning) return true;
  }
  return false;
}

export function getProviderForModel(modelId: string): ProviderInfo | undefined {
  for (const provider of Object.values(PROVIDERS)) {
    if (provider.models.some((m) => m.id === modelId)) return provider;
  }
  return undefined;
}
