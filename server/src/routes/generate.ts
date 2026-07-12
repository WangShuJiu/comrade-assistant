import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { submitWanxTask, pollWanxTask } from "../services/qwen.js";
import { recordImageGenCost } from "../services/cost.js";
import { withRetry } from "../services/deepseek.js";

interface GenerateRequestBody {
  apiKey: string;
  prompt: string;
  size?: string;
  n?: number;
}

export function registerGenerateRoutes(server: FastifyInstance, dataDir: string) {
  server.post("/api/generate/image", async (req: FastifyRequest, reply: FastifyReply) => {
    const { apiKey, prompt, size = "1024*1024", n = 1 } = req.body as GenerateRequestBody;

    if (!apiKey) {
      return reply.status(400).send({ error: "API Key is required" });
    }

    if (!prompt || prompt.trim() === "") {
      return reply.status(400).send({ error: "Prompt is required" });
    }

    try {
      const taskId = await withRetry(
        () => submitWanxTask(apiKey, prompt, size, n),
        "Wanx 图像生成任务提交"
      );

      const result = await withRetry(
        () => pollWanxTask(apiKey, taskId),
        "Wanx 任务轮询"
      );

      const costSummary = recordImageGenCost(dataDir);

      const images =
        result.output.results
          ?.filter((r) => r.url && !r.code)
          .map((r) => r.url) || [];

      if (images.length === 0) {
        const errMsg = result.output.results?.[0]?.message || "No images generated";
        return reply.status(500).send({ error: `Image generation failed: ${errMsg}` });
      }

      return reply.send({ images, taskId, cost: costSummary.totalCost });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return reply.status(500).send({ error: `Image generation failed: ${errMsg}` });
    }
  });
}
