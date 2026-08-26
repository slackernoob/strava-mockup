import { createMiddleware } from "hono/factory";

export type AuthEnv = {
  Bindings: Env;
  Variables: { userId: number };
};

// Identity is deliberately trust-based: the client claims one of the 10
// seeded users via X-User-Id. There is no authentication by design.
export const requireUser = createMiddleware<AuthEnv>(async (c, next) => {
  const raw = c.req.header("X-User-Id");
  const id = Number(raw);
  if (!raw || !Number.isInteger(id) || id < 1) {
    return c.json({ error: "Pick your name first." }, 401);
  }
  const user = await c.env.DB.prepare("SELECT id FROM users WHERE id = ?1")
    .bind(id)
    .first<{ id: number }>();
  if (!user) {
    return c.json({ error: "Unknown runner." }, 401);
  }
  c.set("userId", user.id);
  await next();
});
