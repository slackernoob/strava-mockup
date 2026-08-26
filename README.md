# 🏃 Run Club (strava-mockup)

A deliberately tiny Strava for a fixed group of 10 friends who host their own
run clubs and run sessions. One main record (the **Run**), two shared actions
(**"I'm in"** and **kudos**), and one access rule.

## How it works

- **Identity is a name picker.** The 10 runners are seeded; you just pick who
  you are. There is no authentication, by design — this is a trust-based app
  for a small friend group. Anyone with the URL can act as anyone.
- **Runs are the main record.** A run belongs to a club, has a host, and a
  start time. Its lifecycle is purely time-derived: a run in the future is
  *upcoming* (joinable), a run in the past is *completed* (kudos-able).
- **Clubs are a minimal second record.** Anyone can create one; only its
  creator can rename or delete it (deleting cascades to its runs, attendance
  and kudos). Membership is self-serve join/leave.
- **The access rule:** a club's *upcoming* runs are visible only to its
  members. *Completed* runs appear in a shared feed that everyone sees, where
  anyone can give kudos (one per person, never on your own hosted run).
- **Hosting:** any club member can schedule a run and becomes its host. Only
  the host can edit or cancel it, and only while it's upcoming — completed
  runs are immutable history. Hosts always attend their own runs, and you
  can't leave a club while you're hosting upcoming runs in it.

## Stack

One Cloudflare Worker serving both a JSON API ([Hono](https://hono.dev)) and a
Vite + React SPA as static assets, with [D1](https://developers.cloudflare.com/d1/)
(SQLite) for storage. Times are stored as UTC epoch seconds and displayed in
the browser's local time zone.

## Local development

```sh
npm install
npm run db:migrate   # apply schema to the local D1 simulator
npm run db:seed      # load the 10 runners + demo clubs/runs
npm run dev          # http://localhost:5173
```

The seed script is re-runnable — it wipes all data and restores the demo
state, which doubles as the vandalism reset button.

## Deploy

```sh
npx wrangler login
npx wrangler d1 create strava-mockup-db   # once; copy database_id into wrangler.jsonc
npm run db:migrate:remote
npm run db:seed:remote
npm run deploy
```

## API sketch

| Method & path | Rule |
|---|---|
| `GET /api/users` | the 10 runners (no identity needed) |
| `GET/POST /api/clubs` | list / create clubs |
| `GET/PATCH/DELETE /api/clubs/:id` | detail (upcoming runs members-only) / rename / delete — creator only |
| `POST/DELETE /api/clubs/:id/membership` | join / leave |
| `POST /api/clubs/:id/runs` | schedule a run — members only |
| `PATCH/DELETE /api/runs/:id` | edit / cancel — host only, while upcoming |
| `POST/DELETE /api/runs/:id/attendance` | "I'm in" / "I'm out" — members, while upcoming |
| `GET /api/feed` | completed runs, visible to all |
| `POST/DELETE /api/runs/:id/kudos` | kudos on completed runs — not your own |

All authenticated requests carry an `X-User-Id: 1..10` header that the client
sets from the name picker.
