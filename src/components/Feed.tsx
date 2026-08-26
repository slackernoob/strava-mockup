import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import type { FeedRun } from "../types";
import { formatTime } from "../util";

export function Feed({
  currentUserId,
  onError,
}: {
  currentUserId: number;
  onError: (message: string) => void;
}) {
  const [runs, setRuns] = useState<FeedRun[] | null>(null);

  const load = useCallback(() => {
    api<FeedRun[]>("/feed")
      .then(setRuns)
      .catch((e: Error) => onError(e.message));
  }, [onError]);

  useEffect(load, [load]);

  const toggleKudos = async (run: FeedRun) => {
    try {
      await api(`/runs/${run.id}/kudos`, { method: run.has_kudoed ? "DELETE" : "POST" });
      load();
    } catch (e) {
      onError((e as Error).message);
    }
  };

  if (!runs) return <p className="muted">Loading feed…</p>;
  if (runs.length === 0) {
    return <p className="muted">No completed runs yet — go log some miles.</p>;
  }

  return (
    <div className="cards">
      {runs.map((run) => {
        const isOwnRun = run.host_id === currentUserId;
        return (
          <article className="card" key={run.id}>
            <div className="card-top">
              <span className="chip">{run.club_name}</span>
              <span className="muted">{formatTime(run.starts_at)}</span>
            </div>
            <h3>{run.title}</h3>
            <p className="muted">
              Hosted by {run.host_name}
              {run.location ? ` · ${run.location}` : ""}
            </p>
            <div className="stats">
              {run.distance_km != null && <span>{run.distance_km} km</span>}
              {run.pace && <span>{run.pace}</span>}
            </div>
            {run.description && <p className="desc">{run.description}</p>}
            {run.attendees.length > 0 && (
              <p className="muted">Ran with: {run.attendees.join(", ")}</p>
            )}
            <div className="card-actions">
              <button
                className={`btn kudos${run.has_kudoed ? " given" : ""}`}
                disabled={isOwnRun}
                title={isOwnRun ? "You hosted this run" : run.has_kudoed ? "Take back kudos" : "Give kudos"}
                onClick={() => toggleKudos(run)}
              >
                👍 {run.kudos_count}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
