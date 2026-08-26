import { Hono } from "hono";
import { requireUser, type AuthEnv } from "./identity";

type RunBody = {
  title?: string;
  starts_at?: string | number;
  location?: string;
  distance_km?: number | null;
  pace?: string;
  description?: string;
};

function parseStartsAt(value: string | number | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.floor(value);
  if (typeof value === "string") {
    const ms = Date.parse(value);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }
  return null;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export const runs = new Hono<AuthEnv>();

runs.use("*", requireUser);

runs.post("/clubs/:clubId/runs", async (c) => {
  const userId = c.get("userId");
  const clubId = Number(c.req.param("clubId"));
  const club = await c.env.DB.prepare("SELECT id FROM clubs WHERE id = ?1").bind(clubId).first();
  if (!club) return c.json({ error: "Club not found." }, 404);
  const member = await c.env.DB.prepare(
    "SELECT 1 FROM club_members WHERE club_id = ?1 AND user_id = ?2",
  )
    .bind(clubId, userId)
    .first();
  if (!member) return c.json({ error: "Only club members can host runs here." }, 403);

  const body = await c.req.json<RunBody>().catch(() => ({}) as RunBody);
  const title = body.title?.trim();
  if (!title || title.length > 80) {
    return c.json({ error: "Run title must be 1-80 characters." }, 400);
  }
  const startsAt = parseStartsAt(body.starts_at);
  if (startsAt === null) return c.json({ error: "A valid start time is required." }, 400);
  if (startsAt <= nowSeconds()) {
    return c.json({ error: "Runs must be scheduled in the future." }, 400);
  }
  const distance = body.distance_km == null ? null : Number(body.distance_km);
  if (distance !== null && (!Number.isFinite(distance) || distance <= 0)) {
    return c.json({ error: "Distance must be a positive number." }, 400);
  }

  // Batch so the run and its host's attendance commit atomically;
  // last_insert_rowid() resolves to the run inserted in the same session.
  const [inserted] = await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO runs (club_id, host_id, title, starts_at, location, distance_km, pace, description)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    ).bind(
      clubId,
      userId,
      title,
      startsAt,
      body.location?.trim() || null,
      distance,
      body.pace?.trim() || null,
      body.description?.trim() || null,
    ),
    c.env.DB.prepare(
      "INSERT INTO run_attendees (run_id, user_id) VALUES (last_insert_rowid(), ?1)",
    ).bind(userId),
  ]);
  return c.json({ id: inserted.meta.last_row_id }, 201);
});

async function loadRun(db: D1Database, runId: number) {
  return db
    .prepare("SELECT id, club_id, host_id, starts_at FROM runs WHERE id = ?1")
    .bind(runId)
    .first<{ id: number; club_id: number; host_id: number; starts_at: number }>();
}

runs.patch("/runs/:id", async (c) => {
  const userId = c.get("userId");
  const run = await loadRun(c.env.DB, Number(c.req.param("id")));
  if (!run) return c.json({ error: "Run not found." }, 404);
  if (run.host_id !== userId) return c.json({ error: "Only the host can edit this run." }, 403);
  if (run.starts_at <= nowSeconds()) {
    return c.json({ error: "Completed runs are history — they can't be edited." }, 409);
  }

  const body = await c.req.json<RunBody>().catch(() => ({}) as RunBody);
  const sets: string[] = [];
  const values: unknown[] = [];

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title || title.length > 80) {
      return c.json({ error: "Run title must be 1-80 characters." }, 400);
    }
    sets.push("title = ?");
    values.push(title);
  }
  if (body.starts_at !== undefined) {
    const startsAt = parseStartsAt(body.starts_at);
    if (startsAt === null) return c.json({ error: "A valid start time is required." }, 400);
    if (startsAt <= nowSeconds()) {
      return c.json({ error: "Runs must be scheduled in the future." }, 400);
    }
    sets.push("starts_at = ?");
    values.push(startsAt);
  }
  if (body.distance_km !== undefined) {
    const distance = body.distance_km == null ? null : Number(body.distance_km);
    if (distance !== null && (!Number.isFinite(distance) || distance <= 0)) {
      return c.json({ error: "Distance must be a positive number." }, 400);
    }
    sets.push("distance_km = ?");
    values.push(distance);
  }
  for (const field of ["location", "pace", "description"] as const) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(body[field]?.trim() || null);
    }
  }

  if (sets.length > 0) {
    values.push(run.id);
    await c.env.DB.prepare(`UPDATE runs SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  }
  return c.json({ ok: true });
});

runs.delete("/runs/:id", async (c) => {
  const userId = c.get("userId");
  const run = await loadRun(c.env.DB, Number(c.req.param("id")));
  if (!run) return c.json({ error: "Run not found." }, 404);
  if (run.host_id !== userId) return c.json({ error: "Only the host can cancel this run." }, 403);
  if (run.starts_at <= nowSeconds()) {
    return c.json({ error: "Completed runs are history — they can't be deleted." }, 409);
  }
  await c.env.DB.prepare("DELETE FROM runs WHERE id = ?1").bind(run.id).run();
  return c.json({ ok: true });
});

runs.post("/runs/:id/attendance", async (c) => {
  const userId = c.get("userId");
  const run = await loadRun(c.env.DB, Number(c.req.param("id")));
  if (!run) return c.json({ error: "Run not found." }, 404);
  if (run.starts_at <= nowSeconds()) {
    return c.json({ error: "This run already happened." }, 409);
  }
  const member = await c.env.DB.prepare(
    "SELECT 1 FROM club_members WHERE club_id = ?1 AND user_id = ?2",
  )
    .bind(run.club_id, userId)
    .first();
  if (!member) return c.json({ error: "Join the club to attend its runs." }, 403);
  await c.env.DB.prepare("INSERT OR IGNORE INTO run_attendees (run_id, user_id) VALUES (?1, ?2)")
    .bind(run.id, userId)
    .run();
  return c.json({ ok: true });
});

runs.delete("/runs/:id/attendance", async (c) => {
  const userId = c.get("userId");
  const run = await loadRun(c.env.DB, Number(c.req.param("id")));
  if (!run) return c.json({ error: "Run not found." }, 404);
  if (run.starts_at <= nowSeconds()) {
    return c.json({ error: "This run already happened." }, 409);
  }
  if (run.host_id === userId) {
    return c.json({ error: "Hosts can't bail on their own run — cancel it instead." }, 409);
  }
  await c.env.DB.prepare("DELETE FROM run_attendees WHERE run_id = ?1 AND user_id = ?2")
    .bind(run.id, userId)
    .run();
  return c.json({ ok: true });
});
