import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getDb } from "../services/database.js";
import { v4 as uuidv4 } from "uuid";

interface ChatMessage {
  role: string;
  content: string;
  reasoning_content?: string;
  image?: { base64: string; mimeType: string };
}

export function registerHistoryRoutes(server: FastifyInstance, dataDir: string) {
  const db = () => getDb(dataDir);

  // List histories with optional search and pin-first ordering
  server.get("/api/history", async (req: FastifyRequest) => {
    const { search = "" } = (req.query || {}) as { search?: string };
    const term = `%${search}%`;

    let rows;
    if (search) {
      rows = db()
        .prepare(
          `SELECT id, title, model, pinned, updated_at FROM chats
           WHERE title LIKE ? OR id IN (
             SELECT id FROM chats WHERE messages LIKE ?
           )
           ORDER BY pinned DESC, updated_at DESC`
        )
        .all(term, term) as any[];
    } else {
      rows = db()
        .prepare(
          `SELECT id, title, model, pinned, updated_at FROM chats
           ORDER BY pinned DESC, updated_at DESC`
        )
        .all() as any[];
    }

    return {
      histories: rows.map((r) => ({
        id: r.id,
        title: r.title,
        updatedAt: r.updated_at,
        model: r.model,
        pinned: !!r.pinned,
      })),
    };
  });

  // Get single history
  server.get("/api/history/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const row = db().prepare(`SELECT * FROM chats WHERE id = ?`).get(id) as any;
    if (!row) return reply.status(404).send({ error: "History not found" });

    return {
      id: row.id,
      title: row.title,
      updatedAt: row.updated_at,
      model: row.model,
      pinned: !!row.pinned,
      messages: JSON.parse(row.messages || "[]"),
    };
  });

  // Save/update history
  server.post("/api/history", async (req: FastifyRequest) => {
    const body = req.body as {
      id?: string;
      title: string;
      model: string;
      messages: ChatMessage[];
    };
    const id = body.id || uuidv4();
    const now = new Date().toISOString();

    db()
      .prepare(
        `INSERT INTO chats (id, title, model, messages, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           model = excluded.model,
           messages = excluded.messages,
           updated_at = excluded.updated_at`
      )
      .run(id, body.title || "新对话", body.model || "unknown", JSON.stringify(body.messages || []), now, now);

    return { id };
  });

  // Toggle pin
  server.patch("/api/history/:id/pin", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const row = db().prepare(`SELECT pinned FROM chats WHERE id = ?`).get(id) as any;
    if (!row) return reply.status(404).send({ error: "History not found" });

    const newPinned = row.pinned ? 0 : 1;
    db().prepare(`UPDATE chats SET pinned = ? WHERE id = ?`).run(newPinned, id);
    return { id, pinned: !!newPinned };
  });

  // Delete history
  server.delete("/api/history/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const result = db().prepare(`DELETE FROM chats WHERE id = ?`).run(id);
    if (result.changes === 0) return reply.status(404).send({ error: "History not found" });
    return { ok: true };
  });

  server.delete("/api/history", async () => {
    db().prepare(`DELETE FROM chats`).run();
    return { ok: true };
  });
}
