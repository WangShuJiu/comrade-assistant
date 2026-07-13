import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createDeepSeekClient, createStreamOptions, applySlidingWindow, withRetry } from "../services/deepseek.js";
import { recordChatCost } from "../services/cost.js";
import { getTemperatureAndPrompt } from "../services/temperature.js";

interface ChatRequestBody {
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  useAutoDetect?: boolean;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
  maxRounds?: number;
}

export function registerChatRoutes(server: FastifyInstance, dataDir: string) {
  server.post("/api/chat/stream", async (req: FastifyRequest, reply: FastifyReply) => {
    const {
      apiKey,
      model,
      messages,
      useAutoDetect = true,
      temperature: manualTemp = 0.3,
      systemPrompt: manualPrompt = "你是一位全能AI助手，请用中文回答。",
      maxTokens = 8192,
      maxRounds = 10,
    } = req.body as ChatRequestBody;

    if (!apiKey || apiKey.trim() === "") {
      return reply.status(400).send({ error: "API Key is required" });
    }

    const client = createDeepSeekClient(apiKey);
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

    // 注入系统提示词
    const sysIdx = chatMessages.findIndex((m) => m.role === "system");
    if (sysIdx >= 0) {
      chatMessages[sysIdx] = { role: "system", content: finalSysPrompt };
    } else {
      chatMessages.unshift({ role: "system", content: finalSysPrompt });
    }

    const truncatedMessages = applySlidingWindow(chatMessages, maxTokens, maxRounds);
    const streamOpts = createStreamOptions(model, truncatedMessages, finalTemp, maxTokens);

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
    let actualModel = model;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await withRetry(
        () => client.chat.completions.create(streamOpts),
        "DeepSeek Chat"
      );

      for await (const chunk of stream) {
        if (raw.destroyed) break;

        if (chunk.model) actualModel = chunk.model;

        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if ((delta as Record<string, unknown>).reasoning_content) {
          thinkingContent += (delta as Record<string, unknown>).reasoning_content as string;
        }
        if (delta.content) {
          fullContent += delta.content;
        }

        raw.write(
          `data: ${JSON.stringify({
            type: "delta",
            content: delta.content || "",
            reasoning: (delta as Record<string, unknown>).reasoning_content || "",
          })}\n\n`
        );
      }

      try {
        const finalChunk = await stream.finalChatCompletion();
        if (finalChunk.usage) {
          inputTokens = finalChunk.usage.prompt_tokens || 0;
          outputTokens = finalChunk.usage.completion_tokens || 0;
        }
      } catch {
        inputTokens = Math.ceil(
          truncatedMessages.reduce((acc, m) => acc + (typeof m.content === "string" ? m.content.length : 0), 0) / 3
        );
        outputTokens = Math.ceil(fullContent.length / 3);
      }

      const costSummary = recordChatCost(dataDir, actualModel, inputTokens, outputTokens);

      raw.write(
        `data: ${JSON.stringify({
          type: "done",
          model: actualModel,
          thinking: thinkingContent,
          inputTokens,
          outputTokens,
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
