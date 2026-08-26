import { Hono } from "hono";
import { requireUser, type AuthEnv } from "./identity";

const nowSeconds = () => Math.floor(Date.now() / 1000);

export const feed = new Hono<AuthEnv>();

feed.use("*", requireUser);

// Completed runs are public to all 10 runners, regardless of club membership.
feed.get("/feed", async (c) => {
  const userId = c.get("userId");
  const { results: runRows } = await c.env.DB.prepare(
    `SELECT r.id, r.title, r.starts_at, r.location, r.distance_km, r.pace, r.description,
            r.club_id, cl.name AS club_name, r.host_id, u.name AS host_name,
            (SELECT COUNT(*) FROM kudos k WHERE k.run_id = r.id) AS kudos_count,
            EXISTS(SELECT 1 FROM kudos k WHERE k.run_id = r.id AND k.user_id = ?1) AS has_kudoed
       FROM runs r
       JOIN clubs cl ON cl.id = r.club_id
       JOIN users u ON u.id = r.host_id
      WHERE r.starts_at <= unixepoch('now')
      ORDER BY r.starts_at DESC
      LIMIT 50`,
  )
    .bind(userId)
    .all();

  const runIds = runRows.map((r) => r.id as number);
  const attendeesByRun = new Map<number, string[]>();
  if (runIds.length > 0) {
    const { results: attendeeRows } = await c.env.DB.prepare(
      `SELECT ra.run_id, us.name
         FROM run_attendees ra
         JOIN users us ON us.id = ra.user_id
        WHERE ra.run_id IN (${runIds.map(() => "?").join(", ")})
        ORDER BY us.name`,
    )
      .bind(...runIds)
      .all<{ run_id: number; name: string }>();
    for (const a of attendeeRows) {
      const names = attendeesByRun.get(a.run_id);
      if (names) names.push(a.name);
      else attendeesByRun.set(a.run_id, [a.name]);
    }
  }

  return c.json(
    runRows.map((r) => ({
      ...r,
      has_kudoed: Boolean(r.has_kudoed),
      attendees: attendeesByRun.get(r.id as number) ?? [],
    })),
  );
});

feed.post("/runs/:id/kudos", async (c) => {
  const userId = c.get("userId");
  const runId = Number(c.req.param("id"));
  const run = await c.env.DB.prepare("SELECT id, host_id, starts_at FROM runs WHERE id = ?1")
    .bind(runId)
    .first<{ id: number; host_id: number; starts_at: number }>();
  if (!run) return c.json({ error: "Run not found." }, 404);
  if (run.starts_at > nowSeconds()) {
    return c.json({ error: "Kudos come after the run happens." }, 409);
  }
  if (run.host_id === userId) {
    return c.json({ error: "No kudos for your own run." }, 409);
  }
  await c.env.DB.prepare("INSERT OR IGNORE INTO kudos (run_id, user_id) VALUES (?1, ?2)")
    .bind(run.id, userId)
    .run();
  return c.json({ ok: true });
});

feed.delete("/runs/:id/kudos", async (c) => {
  const userId = c.get("userId");
  const runId = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM kudos WHERE run_id = ?1 AND user_id = ?2")
    .bind(runId, userId)
    .run();
  return c.json({ ok: true });
});
