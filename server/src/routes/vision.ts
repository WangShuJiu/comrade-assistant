import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createDeepSeekClient, createStreamOptions, withRetry } from "../services/deepseek.js";
import { callQwenVL, QwenMessage, QwenContentPart } from "../services/qwen.js";
import { recordVisionCost } from "../services/cost.js";
import { getTemperatureAndPrompt } from "../services/temperature.js";

interface VisionRequestBody {
  deepseekApiKey: string;
  qwenApiKey: string;
  deepseekModel: string;
  qwenModel?: string;
  imageBase64: string;
  mimeType?: string;
  userQuestion?: string;
  messages?: { role: string; content: string }[];
  useAutoDetect?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export function registerVisionRoutes(server: FastifyInstance, dataDir: string) {
  server.post("/api/vision/stream", async (req: FastifyRequest, reply: FastifyReply) => {
    const {
      deepseekApiKey,
      qwenApiKey,
      deepseekModel = "deepseek-v4-pro",
      qwenModel = "qwen-vl-plus",
      imageBase64,
      mimeType = "image/jpeg",
      userQuestion = "请分析这张图片",
      messages = [],
      useAutoDetect = true,
      temperature = 0.3,
      maxTokens = 8192,
    } = req.body as VisionRequestBody;

    if (!deepseekApiKey || !qwenApiKey) {
      return reply.status(400).send({ error: "Both API keys are required" });
    }

    if (!imageBase64) {
      return reply.status(400).send({ error: "Image data is required" });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageUrl = `data:${mimeType};base64,${cleanBase64}`;

    const raw = reply.raw;
    raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    raw.flushHeaders();

    try {
      // 阶段1: 图像特征提取
      raw.write(
        `data: ${JSON.stringify({
          type: "status",
          stage: "vision",
          message: "正在提取图像特征...",
        })}\n\n`
      );

      const visionPrompt =
        "请详细地描述这张图片中的所有内容，包括：可见的文字、物体、人物、场景、颜色、布局、氛围以及任何细微的细节。越详细越好。如果图片中有代码、图表或UI界面，请逐行逐元素描述。";

      const qwenMessages: QwenMessage[] = [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: visionPrompt },
          ] as QwenContentPart[],
        },
      ];

      const visionResult = await withRetry(
        () => callQwenVL(qwenApiKey, qwenModel, qwenMessages, 3000),
        "Qwen-VL 视觉解析"
      );

      raw.write(
        `data: ${JSON.stringify({
          type: "vision_done",
          description: visionResult.content,
        })}\n\n`
      );

      // 阶段2: 深度思考推理
      raw.write(
        `data: ${JSON.stringify({
          type: "status",
          stage: "reasoning",
          message: "正在深度思考...",
        })}\n\n`
      );

      const systemMsg = {
        role: "system" as const,
        content: `你是一位具备强大推理能力的AI助手。用户上传了一张图片，视觉模型已提供详细描述。请基于描述回答用户问题。

图片描述：
${visionResult.content}

请根据以上图片内容，结合你的知识和推理能力，准确回答用户的问题。`,
      };

      const deepseekMessages = [
        systemMsg,
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];

      if (userQuestion && !messages.some((m) => m.content === userQuestion)) {
        deepseekMessages.push({ role: "user", content: userQuestion });
      }

      const client = createDeepSeekClient(deepseekApiKey);
      const finalTemp = useAutoDetect
        ? (await getTemperatureAndPrompt(userQuestion)).temperature
        : temperature;

      const streamOpts = createStreamOptions(deepseekModel, deepseekMessages, finalTemp, maxTokens);

      let fullContent = "";
      let thinkingContent = "";
      let actualModel = deepseekModel;
      let inputTokens = 0;
      let outputTokens = 0;

      const stream = await withRetry(
        () => client.chat.completions.create(streamOpts),
        "DeepSeek 推理"
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
          deepseekMessages.reduce((acc, m) => acc + m.content.length, 0) / 3
        );
        outputTokens = Math.ceil(fullContent.length / 3);
      }

      const costSummary = recordVisionCost(
        dataDir,
        qwenModel,
        actualModel,
        visionResult.inputTokens,
        visionResult.outputTokens,
        inputTokens,
        outputTokens
      );

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
        `data: ${JSON.stringify({ type: "error", error: `图片分析失败：${errMsg}` })}\n\n`
      );
    } finally {
      raw.end();
    }
  });
}
