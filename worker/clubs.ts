import { Hono } from "hono";
import { requireUser, type AuthEnv } from "./identity";

export const clubs = new Hono<AuthEnv>();

clubs.use("*", requireUser);

clubs.get("/", async (c) => {
  const userId = c.get("userId");
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.created_by, u.name AS creator_name,
            (SELECT COUNT(*) FROM club_members m WHERE m.club_id = c.id) AS member_count,
            EXISTS(SELECT 1 FROM club_members m WHERE m.club_id = c.id AND m.user_id = ?1) AS is_member
       FROM clubs c
       JOIN users u ON u.id = c.created_by
      ORDER BY c.name`,
  )
    .bind(userId)
    .all();
  return c.json(results.map((r) => ({ ...r, is_member: Boolean(r.is_member) })));
});

clubs.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name?: string }>().catch(() => ({}) as { name?: string });
  const name = body.name?.trim();
  if (!name || name.length > 60) {
    return c.json({ error: "Club name must be 1-60 characters." }, 400);
  }
  // Batch so the club and its creator's membership commit atomically;
  // last_insert_rowid() resolves to the club inserted in the same session.
  const [inserted] = await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO clubs (name, created_by) VALUES (?1, ?2)").bind(name, userId),
    c.env.DB.prepare(
      "INSERT INTO club_members (club_id, user_id) VALUES (last_insert_rowid(), ?1)",
    ).bind(userId),
  ]);
  return c.json({ id: inserted.meta.last_row_id, name, created_by: userId }, 201);
});

clubs.get("/:id", async (c) => {
  const userId = c.get("userId");
  const clubId = Number(c.req.param("id"));
  const club = await c.env.DB.prepare(
    `SELECT c.id, c.name, c.created_by, u.name AS creator_name
       FROM clubs c
       JOIN users u ON u.id = c.created_by
      WHERE c.id = ?1`,
  )
    .bind(clubId)
    .first<{ id: number; name: string; created_by: number; creator_name: string }>();
  if (!club) return c.json({ error: "Club not found." }, 404);

  const members = (
    await c.env.DB.prepare(
      `SELECT us.id, us.name
         FROM club_members m
         JOIN users us ON us.id = m.user_id
        WHERE m.club_id = ?1
        ORDER BY us.name`,
    )
      .bind(clubId)
      .all<{ id: number; name: string }>()
  ).results;

  const isMember = members.some((m) => m.id === userId);

  // The access rule: upcoming runs are visible to club members only.
  let upcomingRuns: unknown[] | null = null;
  if (isMember) {
    const runRows = (
      await c.env.DB.prepare(
        `SELECT r.id, r.title, r.starts_at, r.location, r.distance_km, r.pace, r.description,
                r.host_id, u.name AS host_name
           FROM runs r
           JOIN users u ON u.id = r.host_id
          WHERE r.club_id = ?1 AND r.starts_at > unixepoch('now')
          ORDER BY r.starts_at`,
      )
        .bind(clubId)
        .all()
    ).results;
    const attendeeRows = (
      await c.env.DB.prepare(
        `SELECT ra.run_id, us.id, us.name
           FROM run_attendees ra
           JOIN runs r ON r.id = ra.run_id
           JOIN users us ON us.id = ra.user_id
          WHERE r.club_id = ?1 AND r.starts_at > unixepoch('now')
          ORDER BY us.name`,
      )
        .bind(clubId)
        .all<{ run_id: number; id: number; name: string }>()
    ).results;
    upcomingRuns = runRows.map((r) => ({
      ...r,
      attendees: attendeeRows
        .filter((a) => a.run_id === r.id)
        .map((a) => ({ id: a.id, name: a.name })),
    }));
  }

  return c.json({ ...club, is_member: isMember, members, upcoming_runs: upcomingRuns });
});

clubs.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const clubId = Number(c.req.param("id"));
  const club = await c.env.DB.prepare("SELECT id, created_by FROM clubs WHERE id = ?1")
    .bind(clubId)
    .first<{ id: number; created_by: number }>();
  if (!club) return c.json({ error: "Club not found." }, 404);
  if (club.created_by !== userId) {
    return c.json({ error: "Only the club creator can rename it." }, 403);
  }
  const body = await c.req.json<{ name?: string }>().catch(() => ({}) as { name?: string });
  const name = body.name?.trim();
  if (!name || name.length > 60) {
    return c.json({ error: "Club name must be 1-60 characters." }, 400);
  }
  await c.env.DB.prepare("UPDATE clubs SET name = ?1 WHERE id = ?2").bind(name, clubId).run();
  return c.json({ ok: true });
});

clubs.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const clubId = Number(c.req.param("id"));
  const club = await c.env.DB.prepare("SELECT id, created_by FROM clubs WHERE id = ?1")
    .bind(clubId)
    .first<{ id: number; created_by: number }>();
  if (!club) return c.json({ error: "Club not found." }, 404);
  if (club.created_by !== userId) {
    return c.json({ error: "Only the club creator can delete it." }, 403);
  }
  // ON DELETE CASCADE removes the club's runs, attendance and kudos.
  await c.env.DB.prepare("DELETE FROM clubs WHERE id = ?1").bind(clubId).run();
  return c.json({ ok: true });
});

clubs.post("/:id/membership", async (c) => {
  const userId = c.get("userId");
  const clubId = Number(c.req.param("id"));
  const club = await c.env.DB.prepare("SELECT id FROM clubs WHERE id = ?1").bind(clubId).first();
  if (!club) return c.json({ error: "Club not found." }, 404);
  await c.env.DB.prepare("INSERT OR IGNORE INTO club_members (club_id, user_id) VALUES (?1, ?2)")
    .bind(clubId, userId)
    .run();
  return c.json({ ok: true });
});

clubs.delete("/:id/membership", async (c) => {
  const userId = c.get("userId");
  const clubId = Number(c.req.param("id"));
  const hosting = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM runs
      WHERE club_id = ?1 AND host_id = ?2 AND starts_at > unixepoch('now')`,
  )
    .bind(clubId, userId)
    .first<{ n: number }>();
  if (hosting && hosting.n > 0) {
    return c.json({ error: "Cancel your upcoming runs in this club before leaving." }, 409);
  }
  // Leaving also withdraws attendance from the club's upcoming runs,
  // since a non-member can no longer see them.
  await c.env.DB.batch([
    c.env.DB.prepare(
      `DELETE FROM run_attendees
        WHERE user_id = ?2 AND run_id IN
          (SELECT id FROM runs WHERE club_id = ?1 AND starts_at > unixepoch('now'))`,
    ).bind(clubId, userId),
    c.env.DB.prepare("DELETE FROM club_members WHERE club_id = ?1 AND user_id = ?2").bind(
      clubId,
      userId,
    ),
  ]);
  return c.json({ ok: true });
});
