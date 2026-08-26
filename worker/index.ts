import { Hono } from "hono";
import { users } from "./users";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/users", users);

app.notFound((c) => c.json({ error: "Not found." }, 404));

app.onError((err, c) => {
  console.log(JSON.stringify({ level: "error", message: err.message }));
  return c.json({ error: "Something went wrong." }, 500);
});

export default app;
