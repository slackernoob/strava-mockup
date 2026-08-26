import { Hono } from "hono";

export const users = new Hono<{ Bindings: Env }>();

users.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name FROM users ORDER BY id",
  ).all<{ id: number; name: string }>();
  return c.json(results);
});
