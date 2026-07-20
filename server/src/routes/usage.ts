import { FastifyInstance } from "fastify";
import { loadCosts } from "../services/cost.js";
import { fetchDeepSeekBalance } from "../services/deepseek-balance.js";

export function registerUsageRoutes(server: FastifyInstance, dataDir: string) {
  server.get("/api/usage", async () => {
    return loadCosts(dataDir);
  });

  server.get("/api/balance", async (req) => {
    const apiKey =
      (req.query as Record<string, string>).api_key ||
      process.env.DEEPSEEK_API_KEY ||
      "";

    if (!apiKey) {
      return { deepseek: null, message: "No DeepSeek API key configured" };
    }

    const balance = await fetchDeepSeekBalance(apiKey);
    return { deepseek: balance };
  });
}
