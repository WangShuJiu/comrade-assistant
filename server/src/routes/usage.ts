import { FastifyInstance } from "fastify";
import { loadCosts } from "../services/cost.js";

export function registerUsageRoutes(server: FastifyInstance, dataDir: string) {
  server.get("/api/usage", async () => {
    return loadCosts(dataDir);
  });
}
