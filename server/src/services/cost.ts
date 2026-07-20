import { getDb } from "./database.js";
import { getModelPricing } from "./providers/registry.js";

export interface CostEntry {
  id?: number;
  provider: string;
  model: string;
  action: "chat" | "vision" | "generate";
  inputTokens: number;
  outputTokens: number;
  cost: number;
  createdAt?: string;
}

export interface ProviderStats {
  inputTokens: number;
  outputTokens: number;
  cost: number;
  calls: number;
  imagesGenerated?: number;
}

export interface CostSummary {
  providers: Record<string, ProviderStats>;
  totalCost: number;
  recentEntries: CostEntry[];
}

interface PricingInfo {
  input: number;
  output: number;
  inputCacheHit?: number;
}

const QWEN_PRICING: Record<string, PricingInfo> = {
  "qwen-vl-plus": { input: 0.0015, output: 0.0045 },
  "qwen-vl-max": { input: 0.003, output: 0.009 },
  "wanx-v1": { input: 0, output: 0 },
};

const DEFAULT_PRICING: PricingInfo = { input: 0, output: 0 };

const IMAGE_GEN_COST = 0.06;

function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheHitInputTokens: number = 0
): number {
  const pricing: PricingInfo = getModelPricing(model) || QWEN_PRICING[model] || DEFAULT_PRICING;
  const cacheMissInput = Math.max(0, inputTokens - cacheHitInputTokens);
  const cacheHitPrice = pricing.inputCacheHit ?? pricing.input;
  return (
    (cacheMissInput / 1_000_000) * pricing.input +
    (cacheHitInputTokens / 1_000_000) * cacheHitPrice +
    (outputTokens / 1_000_000) * pricing.output
  );
}

function insertUsage(dataDir: string, entry: CostEntry) {
  const d = getDb(dataDir);
  d.prepare(
    `INSERT INTO usage_log (provider, model, action, input_tokens, output_tokens, cost)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(entry.provider, entry.model, entry.action, entry.inputTokens, entry.outputTokens, entry.cost);
}

export function loadCosts(dataDir: string): CostSummary {
  const d = getDb(dataDir);

  const stats = d
    .prepare(
      `SELECT provider,
              SUM(input_tokens) as input_tokens,
              SUM(output_tokens) as output_tokens,
              SUM(cost) as cost,
              COUNT(*) as calls
       FROM usage_log
       GROUP BY provider`
    )
    .all() as {
    provider: string;
    input_tokens: number;
    output_tokens: number;
    cost: number;
    calls: number;
  }[];

  const providers: Record<string, ProviderStats> = {};
  for (const s of stats) {
    const genCount = (d.prepare(`SELECT COUNT(*) as cnt FROM usage_log WHERE provider=? AND action='generate'`).get(s.provider) as Record<string, number>)?.cnt || 0;
    providers[s.provider] = {
      inputTokens: s.input_tokens,
      outputTokens: s.output_tokens,
      cost: s.cost,
      calls: s.calls,
      imagesGenerated: genCount,
    };
  }

  const totalRow = d.prepare(`SELECT SUM(cost) as total FROM usage_log`).get() as { total: number };
  const totalCost = totalRow?.total || 0;

  const recentEntries = d
    .prepare(`SELECT * FROM usage_log ORDER BY id DESC LIMIT 50`)
    .all() as CostEntry[];

  return { providers, totalCost, recentEntries };
}

export function recordChatCost(
  dataDir: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheHitInputTokens: number = 0
): CostSummary {
  const cost = calcCost(model, inputTokens, outputTokens, cacheHitInputTokens);
  insertUsage(dataDir, {
    provider,
    model,
    action: "chat",
    inputTokens,
    outputTokens,
    cost,
  });
  return loadCosts(dataDir);
}

export function recordVisionCost(
  dataDir: string,
  qwenModel: string,
  reasoningProvider: string,
  reasoningModel: string,
  qwenInput: number,
  qwenOutput: number,
  reasoningInput: number,
  reasoningOutput: number,
  reasoningCacheHit: number = 0
): CostSummary {
  const qwenCost = calcCost(qwenModel, qwenInput, qwenOutput);
  insertUsage(dataDir, {
    provider: "qwen",
    model: qwenModel,
    action: "vision",
    inputTokens: qwenInput,
    outputTokens: qwenOutput,
    cost: qwenCost,
  });

  const reasoningCost = calcCost(reasoningModel, reasoningInput, reasoningOutput, reasoningCacheHit);
  insertUsage(dataDir, {
    provider: reasoningProvider,
    model: reasoningModel,
    action: "chat",
    inputTokens: reasoningInput,
    outputTokens: reasoningOutput,
    cost: reasoningCost,
  });

  return loadCosts(dataDir);
}

export function recordImageGenCost(dataDir: string): CostSummary {
  insertUsage(dataDir, {
    provider: "qwen",
    model: "wanx-v1",
    action: "generate",
    inputTokens: 0,
    outputTokens: 0,
    cost: IMAGE_GEN_COST,
  });
  return loadCosts(dataDir);
}

export function getDefaultSystemPrompt(): string {
  return "你是一位精通多种编程语言的AI专家助手，名叫 Comrade。请用中文回答，代码用 Markdown 格式给出，并加上简要解释。你有很强的逻辑推理能力，能够处理复杂的技术问题。";
}
