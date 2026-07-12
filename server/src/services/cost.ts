import { getDb } from "./database.js";

export interface CostEntry {
  id?: number;
  provider: "deepseek" | "qwen";
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
  deepseek: ProviderStats;
  qwen: ProviderStats;
  totalCost: number;
  recentEntries: CostEntry[];
}

const PRICING: Record<string, { input: number; output: number }> = {
  "deepseek-v4-pro": { input: 0.55, output: 2.19 },
  "deepseek-v4-flash": { input: 0.14, output: 0.55 },
  "deepseek-chat": { input: 0.14, output: 0.28 },
  "qwen-vl-plus": { input: 0.0015, output: 0.0045 },
  "qwen-vl-max": { input: 0.003, output: 0.009 },
  "wanx-v1": { input: 0, output: 0 },
};

const IMAGE_GEN_COST = 0.06;

function calcCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = PRICING[model] || PRICING["deepseek-chat"];
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
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

  const deepseek =
    stats.find((s) => s.provider === "deepseek") ||
    ({ input_tokens: 0, output_tokens: 0, cost: 0, calls: 0 } as any);

  const qwenData = stats.find((s) => s.provider === "qwen");
  const genCount = (d.prepare(`SELECT COUNT(*) as cnt FROM usage_log WHERE provider='qwen' AND action='generate'`).get() as Record<string, number>)?.cnt || 0;
  const qwen: ProviderStats = qwenData
    ? { ...qwenData, imagesGenerated: genCount }
    : { inputTokens: 0, outputTokens: 0, cost: 0, calls: 0, imagesGenerated: genCount };

  const totalRow = d.prepare(`SELECT SUM(cost) as total FROM usage_log`).get() as { total: number };
  const totalCost = totalRow?.total || 0;

  const recentEntries = d
    .prepare(`SELECT * FROM usage_log ORDER BY id DESC LIMIT 50`)
    .all() as CostEntry[];

  return { deepseek, qwen, totalCost, recentEntries };
}

export function recordChatCost(
  dataDir: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): CostSummary {
  const cost = calcCost(model, inputTokens, outputTokens);
  insertUsage(dataDir, {
    provider: "deepseek",
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
  deepseekModel: string,
  qwenInput: number,
  qwenOutput: number,
  dsInput: number,
  dsOutput: number
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

  const dsCost = calcCost(deepseekModel, dsInput, dsOutput);
  insertUsage(dataDir, {
    provider: "deepseek",
    model: deepseekModel,
    action: "chat",
    inputTokens: dsInput,
    outputTokens: dsOutput,
    cost: dsCost,
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
