import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { streamChat, applySlidingWindow, getProviderApiKey } from "../services/providers/index.js";
import { recordChatCost } from "../services/cost.js";
import { getTemperatureAndPrompt } from "../services/temperature.js";

interface ChatRequestBody {
  provider?: string;
  apiKey?: string;
  model?: string;
  messages: { role: string; content: string }[];
  apiKeys?: Record<string, string>;
  useAutoDetect?: boolean;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
  maxRounds?: number;
}

export function registerChatRoutes(server: FastifyInstance, dataDir: string) {
  server.post("/api/chat/stream", async (req: FastifyRequest, reply: FastifyReply) => {
    const {
      provider = "deepseek",
      apiKey,
      model = "deepseek-v4-pro",
      messages,
      apiKeys = {},
      useAutoDetect = true,
      temperature: manualTemp = 0.3,
      systemPrompt: manualPrompt = "你是一位全能AI助手，请用中文回答。",
      maxTokens = 8192,
      maxRounds = 10,
    } = req.body as ChatRequestBody;

    const effectiveApiKey = apiKey || getProviderApiKey(provider, apiKeys);

    if (!effectiveApiKey || effectiveApiKey.trim() === "") {
      return reply.status(400).send({ error: `API Key is required for provider: ${provider}` });
    }

    const chatMessages = messages.map((m) => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    }));

    let finalTemp: number;
    let finalSysPrompt: string;

    if (useAutoDetect) {
      const lastUserMsg = [...chatMessages].reverse().find((m) => m.role === "user");
      const userQuery = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
      const result = userQuery
        ? await getTemperatureAndPrompt(userQuery)
        : { temperature: 0.3, systemPrompt: "你是一位全能AI助手，请用中文回答。" };
      finalTemp = result.temperature;
      finalSysPrompt = result.systemPrompt;
    } else {
      finalTemp = manualTemp;
      finalSysPrompt = manualPrompt;
    }

    const sysIdx = chatMessages.findIndex((m) => m.role === "system");
    if (sysIdx >= 0) {
      chatMessages[sysIdx] = { role: "system", content: finalSysPrompt };
    } else {
      chatMessages.unshift({ role: "system", content: finalSysPrompt });
    }

    const truncatedMessages = applySlidingWindow(chatMessages, maxTokens, maxRounds);

    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    raw.flushHeaders();

    let fullContent = "";
    let thinkingContent = "";

    try {
      const controller = new AbortController();
      raw.on("close", () => controller.abort());

      const result = await streamChat(
        provider,
        effectiveApiKey,
        model,
        truncatedMessages,
        { temperature: finalTemp, maxTokens },
        (chunk) => {
          if (raw.destroyed) return;
          if (chunk.content) fullContent += chunk.content;
          if (chunk.reasoning) thinkingContent += chunk.reasoning;
          raw.write(
            `data: ${JSON.stringify({
              type: "delta",
              content: chunk.content,
              reasoning: chunk.reasoning,
            })}\n\n`
          );
        },
        controller.signal
      );

      const costSummary = recordChatCost(
        dataDir,
        provider,
        result.model,
        result.inputTokens,
        result.outputTokens
      );

      raw.write(
        `data: ${JSON.stringify({
          type: "done",
          model: result.model,
          thinking: thinkingContent,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          cost: costSummary.totalCost,
        })}\n\n`
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      raw.write(
        `data: ${JSON.stringify({ type: "error", error: `API调用失败：${errMsg}` })}\n\n`
      );
    } finally {
      raw.end();
    }
  });
}
