import OpenAI from "openai";
import { getProvider, isThinkingModel } from "./registry.js";
import type { ChatMessage, ChatOptions, ChatStreamResult, StreamChunkCallback } from "./types.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

function createClient(apiKey: string, baseURL: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL,
    timeout: 120000,
    maxRetries: MAX_RETRIES,
  });
}

async function withRetry<T>(
  fn: () => Promise<T>,
  operation: string,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(
          `[RETRY] ${operation} 第 ${attempt}/${maxRetries} 次重试，等待 ${delay}ms...`
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw new Error(`${operation} 失败（已重试 ${maxRetries} 次）：${lastError?.message}`);
}

export async function streamOpenAICompatible(
  providerId: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
  onChunk: StreamChunkCallback,
  signal?: AbortSignal
): Promise<ChatStreamResult> {
  const provider = getProvider(providerId);
  if (!provider || provider.type !== "openai-compatible") {
    throw new Error(`Invalid OpenAI-compatible provider: ${providerId}`);
  }

  const client = createClient(apiKey, provider.baseURL);

  const streamOpts: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model,
    messages: messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    })),
    temperature: options.temperature,
    max_tokens: options.maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (isThinkingModel(model) && providerId === "deepseek") {
    (streamOpts as unknown as Record<string, unknown>).reasoning_effort = "high";
    (streamOpts as unknown as Record<string, unknown>).extra_body = { thinking: { type: "enabled" } };
  }

  const stream = await withRetry(
    () => client.chat.completions.create(streamOpts, { signal }),
    `${provider.name} Chat`
  );

  let actualModel = model;
  let inputTokens = 0;
  let outputTokens = 0;
  let cacheHitInputTokens = 0;

  for await (const chunk of stream) {
    if (signal?.aborted) break;

    if (chunk.model) actualModel = chunk.model;

    const delta = chunk.choices?.[0]?.delta;
    if (!delta) continue;

    const content = delta.content || "";
    const reasoning = (delta as Record<string, unknown>).reasoning_content as string || "";

    if (content || reasoning) {
      onChunk({ type: "delta", content, reasoning });
    }
  }

  try {
    const finalChunk = await (stream as any).finalChatCompletion();
    if (finalChunk.usage) {
      inputTokens = finalChunk.usage.prompt_tokens || 0;
      outputTokens = finalChunk.usage.completion_tokens || 0;
      const details = finalChunk.usage.prompt_tokens_details;
      if (details?.cached_tokens) {
        cacheHitInputTokens = details.cached_tokens;
      }
    }
  } catch {
    inputTokens = Math.ceil(
      messages.reduce((acc, m) => acc + m.content.length, 0) / 3
    );
    outputTokens = 0;
  }

  return { model: actualModel, inputTokens, outputTokens, cacheHitInputTokens };
}

export function applySlidingWindow(
  messages: ChatMessage[],
  maxTokens: number,
  maxRounds: number
): ChatMessage[] {
  const systemMsg = messages.find((m) => m.role === "system");
  const history = messages.filter((m) => m.role !== "system");

  const maxMessages = maxRounds * 2;
  const truncated = history.slice(-maxMessages);

  function estimateTokens(text: string): number {
    if (typeof text !== "string") return 0;
    return Math.ceil(text.length / 2);
  }

  let totalEstimate = estimateTokens(systemMsg?.content || "");
  const result: ChatMessage[] = [];
  const budgetLimit = Math.floor(maxTokens * 0.7);

  for (let i = truncated.length - 1; i >= 0; i--) {
    const msg = truncated[i];
    const est = estimateTokens(msg.content);
    if (totalEstimate + est > budgetLimit && result.length >= 2) break;
    totalEstimate += est;
    result.unshift(msg);
  }

  if (systemMsg) result.unshift(systemMsg);
  return result;
}
