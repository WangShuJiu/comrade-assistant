import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { registerChatRoutes } from "./routes/chat.js";
import { registerVisionRoutes } from "./routes/vision.js";
import { registerGenerateRoutes } from "./routes/generate.js";
import { registerHistoryRoutes } from "./routes/history.js";
import { registerConfigRoutes } from "./routes/config.js";
import { registerUsageRoutes } from "./routes/usage.js";
import { closeDb } from "./services/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..", "..");
const DATA_DIR = path.join(PROJECT_ROOT, "data");
const WEB_DIR = path.join(PROJECT_ROOT, "web", "dist");

const server = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024,
  routerOptions: { maxParamLength: 500 },
});

await server.register(cors, { origin: true, credentials: true });

registerChatRoutes(server, DATA_DIR);
registerVisionRoutes(server, DATA_DIR);
registerGenerateRoutes(server, DATA_DIR);
registerHistoryRoutes(server, DATA_DIR);
registerConfigRoutes(server, DATA_DIR);
registerUsageRoutes(server, DATA_DIR);

server.get("/api/health", async () => ({
  status: "ok",
  timestamp: Date.now(),
  uptime: process.uptime(),
}));

// 从环境变量预填充 API Key（安全性：禁止硬编码）
server.get("/api/env-keys", async () => ({
  deepseekApiKey: !!process.env.DEEPSEEK_API_KEY,
  qwenApiKey: !!process.env.QWEN_API_KEY,
}));

try {
  await server.register(fastifyStatic, {
    root: WEB_DIR,
    prefix: "/",
    wildcard: false,
  });
  server.setNotFoundHandler((_req, reply) => {
    reply.sendFile("index.html");
  });
} catch {
  server.log.warn("Frontend build not found at", WEB_DIR);
}

const PORT = parseInt(process.env.PORT || "3090");
const HOST = process.env.HOST || "0.0.0.0";

// 优雅退出
process.on("SIGINT", () => {
  closeDb();
  process.exit(0);
});
process.on("SIGTERM", () => {
  closeDb();
  process.exit(0);
});

try {
  await server.listen({ port: PORT, host: HOST });
  console.log(`\n🚀 Comrade Assistant running at http://localhost:${PORT}\n`);
  if (process.env.DEEPSEEK_API_KEY) console.log("   ✅ DEEPSEEK_API_KEY loaded from .env");
  if (process.env.QWEN_API_KEY) console.log("   ✅ QWEN_API_KEY loaded from .env\n");
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
