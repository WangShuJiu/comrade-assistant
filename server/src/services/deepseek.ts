import OpenAI from "openai";
import type { FastifyRequest } from "fastify";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export function createDeepSeekClient(apiKey: string): OpenAI {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com",
    timeout: 120000,
    maxRetries: MAX_RETRIES,
  });
}

export function isThinkingModel(model: string): boolean {
  return model === "deepseek-v4-pro" || model.includes("v4-pro");
}

export function createStreamOptions(
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  temperature: number,
  maxTokens: number
): OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming {
  const opts: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
  };

  if (isThinkingModel(model)) {
    (opts as Record<string, unknown>).reasoning_effort = "high";
    (opts as Record<string, unknown>).extra_body = { thinking: { type: "enabled" } };
  }

  return opts;
}

export async function withRetry<T>(
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

/**
 * Token 滑动窗口截断机制
 * 保留 system prompt + 最近 N 轮的 user/assistant 消息
 * 确保总 token 数不超过 maxTokens 的预留比例
 */
export function applySlidingWindow(
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  maxTokens: number,
  maxRounds: number
): OpenAI.Chat.ChatCompletionMessageParam[] {
  const systemMsg = messages.find((m) => m.role === "system");
  const history = messages.filter((m) => m.role !== "system");

  // 限制历史轮次 (每轮 = user + assistant，即 2 条)
  const maxMessages = maxRounds * 2;
  let truncated = history.slice(-maxMessages);

  // Token 预算估算：中文约 1.5 字符/token，英文约 4 字符/token，取保守 2
  function estimateTokens(text: string): number {
    if (typeof text !== "string") return 0;
    return Math.ceil(text.length / 2);
  }

  let totalEstimate = estimateTokens(systemMsg?.content as string || "");
  const result: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  // 从最新的消息开始累加，超过预算 70% 时停止
  const budgetLimit = Math.floor(maxTokens * 0.7);

  for (let i = truncated.length - 1; i >= 0; i--) {
    const msg = truncated[i];
    const est = estimateTokens(msg.content as string);
    if (totalEstimate + est > budgetLimit && result.length >= 2) break;
    totalEstimate += est;
    result.unshift(msg);
  }

  if (systemMsg) result.unshift(systemMsg);
  return result;
}
