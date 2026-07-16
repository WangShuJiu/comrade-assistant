import { FastifyInstance, FastifyRequest } from "fastify";
import { getDb } from "../services/database.js";

interface AppConfig {
  provider: string;
  apiKeys: Record<string, string>;
  models: Record<string, string>;
  deepseekApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  qwenApiKey: string;
  deepseekModel: string;
  openaiModel: string;
  anthropicModel: string;
  qwenModel: string;
  useAutoDetect: boolean;
  temperature: number;
  systemPrompt: string;
  maxTokens: number;
  maxRounds: number;
  budget: number;
}

const DEFAULT_CONFIG: AppConfig = {
  provider: "deepseek",
  apiKeys: {},
  models: {},
  deepseekApiKey: "",
  openaiApiKey: "",
  anthropicApiKey: "",
  qwenApiKey: "",
  deepseekModel: "deepseek-v4-pro",
  openaiModel: "gpt-4.1",
  anthropicModel: "claude-sonnet-4-20250514",
  qwenModel: "qwen-vl-plus",
  useAutoDetect: true,
  temperature: 0.3,
  systemPrompt: "你是一位全能AI助手，请用中文回答。",
  maxTokens: 8192,
  maxRounds: 10,
  budget: 100,
};

export function registerConfigRoutes(server: FastifyInstance, dataDir: string) {
  const db = () => getDb(dataDir);

  server.get("/api/config", async () => {
    const row = db().prepare(`SELECT value FROM config WHERE key = 'app'`).get() as { value: string } | undefined;
    if (!row) return DEFAULT_CONFIG;

    try {
      const parsed = JSON.parse(row.value);
      return { ...DEFAULT_CONFIG, ...parsed };
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  server.post("/api/config", async (req: FastifyRequest) => {
    const body = req.body as Partial<AppConfig>;
    const existingRow = db().prepare(`SELECT value FROM config WHERE key = 'app'`).get() as { value: string } | undefined;

    let existing = DEFAULT_CONFIG;
    if (existingRow) {
      try {
        existing = { ...DEFAULT_CONFIG, ...JSON.parse(existingRow.value) };
      } catch {}
    }

    const merged = { ...existing, ...body };

    db()
      .prepare(
        `INSERT INTO config (key, value) VALUES ('app', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      )
      .run(JSON.stringify(merged));

    return merged;
  });
}
