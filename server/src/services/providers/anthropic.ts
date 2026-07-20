import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, ChatOptions, ChatStreamResult, StreamChunkCallback } from "./types.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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

export async function streamAnthropic(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  options: ChatOptions,
  onChunk: StreamChunkCallback,
  signal?: AbortSignal
): Promise<ChatStreamResult> {
  const client = new Anthropic({ apiKey, timeout: 120000, maxRetries: MAX_RETRIES });

  const systemMsg = messages.find((m) => m.role === "system");
  const chatMessages: Anthropic.MessageParam[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const params: Anthropic.MessageCreateParamsStreaming = {
    model,
    messages: chatMessages,
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: true,
  };

  if (systemMsg) {
    params.system = systemMsg.content;
  }

  let inputTokens = 0;
  let outputTokens = 0;

  const stream = await withRetry(
    () =>
      client.messages.create(params, {
        signal,
      }),
    "Anthropic Chat"
  );

  for await (const event of stream) {
    if (signal?.aborted) break;

    switch (event.type) {
      case "message_start":
        if (event.message.usage) {
          inputTokens = event.message.usage.input_tokens || 0;
          outputTokens = event.message.usage.output_tokens || 0;
        }
        break;

      case "content_block_delta": {
        const delta = event.delta;
        if (delta.type === "text_delta") {
          onChunk({ type: "delta", content: delta.text, reasoning: "" });
        } else if (delta.type === "thinking_delta") {
          onChunk({ type: "delta", content: "", reasoning: delta.thinking });
        } else if (delta.type === "signature_delta") {
          // signature is internal, don't expose
        }
        break;
      }

      case "message_delta":
        if (event.usage) {
          outputTokens = event.usage.output_tokens;
        }
        break;
    }
  }

  return { model, inputTokens, outputTokens, cacheHitInputTokens: 0 };
}
