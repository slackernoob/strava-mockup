import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import type { ClubDetail as ClubDetailData, RunSummary } from "../types";
import { avatarColor, formatTime } from "../util";
import { RunForm } from "./RunForm";

export function ClubDetail({
  clubId,
  currentUserId,
  onBack,
  onError,
}: {
  clubId: number;
  currentUserId: number;
  onBack: () => void;
  onError: (message: string) => void;
}) {
  const [club, setClub] = useState<ClubDetailData | null>(null);
  const [formTarget, setFormTarget] = useState<"new" | RunSummary | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(() => {
    api<ClubDetailData>(`/clubs/${clubId}`)
      .then(setClub)
      .catch((e: Error) => onError(e.message));
  }, [clubId, onError]);

  useEffect(load, [load]);

  const call = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      load();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  if (!club) {
    return (
      <div>
        <button className="back" onClick={onBack}>
          ← All clubs
        </button>
        <p className="muted">Loading club…</p>
      </div>
    );
  }

  const isCreator = club.created_by === currentUserId;

  const toggleMembership = () =>
    call(() =>
      api(`/clubs/${club.id}/membership`, { method: club.is_member ? "DELETE" : "POST" }),
    );

  const rename = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api(`/clubs/${club.id}`, { method: "PATCH", body: { name: newName } });
      setRenaming(false);
      load();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  const deleteClub = async () => {
    if (!confirm(`Delete "${club.name}"? This deletes all its runs, attendance and kudos.`)) {
      return;
    }
    try {
      await api(`/clubs/${club.id}`, { method: "DELETE" });
      onBack();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  const toggleAttendance = (run: RunSummary, attending: boolean) =>
    call(() => api(`/runs/${run.id}/attendance`, { method: attending ? "DELETE" : "POST" }));

  const cancelRun = (run: RunSummary) => {
    if (!confirm(`Cancel "${run.title}"?`)) return;
    void call(() => api(`/runs/${run.id}`, { method: "DELETE" }));
  };

  return (
    <div>
      <button className="back" onClick={onBack}>
        ← All clubs
      </button>
      <div className="detail-head">
        <div>
          {renaming ? (
            <form className="inline-form" onSubmit={rename}>
              <input
                value={newName}
                maxLength={60}
                autoFocus
                onChange={(e) => setNewName(e.target.value)}
              />
              <button className="btn primary" type="submit" disabled={!newName.trim()}>
                Save
              </button>
              <button className="btn" type="button" onClick={() => setRenaming(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <>
              <h2>{club.name}</h2>
              <p className="muted">started by {club.creator_name}</p>
            </>
          )}
        </div>
        <div className="head-actions">
          <button className={club.is_member ? "btn" : "btn primary"} onClick={toggleMembership}>
            {club.is_member ? "Leave" : "Join"}
          </button>
          {isCreator && !renaming && (
            <>
              <button
                className="btn"
                onClick={() => {
                  setNewName(club.name);
                  setRenaming(true);
                }}
              >
                Rename
              </button>
              <button className="btn danger" onClick={deleteClub}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <p className="section-title">Members</p>
      {club.members.length === 0 ? (
        <p className="muted">No members yet.</p>
      ) : (
        <div className="member-chips">
          {club.members.map((m) => (
            <span className="member-chip" key={m.id}>
              <span className="avatar" style={{ background: avatarColor(m.id) }}>
                {m.name[0]}
              </span>
              {m.name}
            </span>
          ))}
        </div>
      )}

      <p className="section-title">Upcoming runs</p>
      {!club.is_member ? (
        <div className="lockbox">
          🔒 Upcoming runs are for members only. Join the club to see and attend them.
        </div>
      ) : (
        <>
          {(club.upcoming_runs ?? []).length === 0 && (
            <p className="muted">Nothing scheduled yet — host the first run.</p>
          )}
          <div className="cards">
            {(club.upcoming_runs ?? []).map((run) => {
              const isHost = run.host_id === currentUserId;
              const attending = run.attendees.some((a) => a.id === currentUserId);
              return (
                <article className="card" key={run.id}>
                  <div className="card-top">
                    <span className="chip">{formatTime(run.starts_at)}</span>
                    <span className="muted">hosted by {isHost ? "you" : run.host_name}</span>
                  </div>
                  <h3>{run.title}</h3>
                  {run.location && <p className="muted">{run.location}</p>}
                  <div className="stats">
                    {run.distance_km != null && <span>{run.distance_km} km</span>}
                    {run.pace && <span>{run.pace}</span>}
                  </div>
                  {run.description && <p className="desc">{run.description}</p>}
                  <p className="muted">
                    {run.attendees.length} going
                    {run.attendees.length > 0 && `: ${run.attendees.map((a) => a.name).join(", ")}`}
                  </p>
                  <div className="card-actions">
                    {isHost ? (
                      <>
                        <button className="btn" onClick={() => setFormTarget(run)}>
                          Edit
                        </button>
                        <button className="btn danger" onClick={() => cancelRun(run)}>
                          Cancel run
                        </button>
                      </>
                    ) : (
                      <button
                        className={attending ? "btn kudos given" : "btn primary"}
                        onClick={() => toggleAttendance(run, attending)}
                      >
                        {attending ? "✓ Going — I'm out" : "I'm in"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
          {formTarget === null ? (
            <div className="card-actions">
              <button className="btn primary" onClick={() => setFormTarget("new")}>
                + Host a run
              </button>
            </div>
          ) : (
            <RunForm
              clubId={club.id}
              run={formTarget === "new" ? null : formTarget}
              onSaved={() => {
                setFormTarget(null);
                load();
              }}
              onCancel={() => setFormTarget(null)}
              onError={onError}
            />
          )}
        </>
      )}
    </div>
  );
}
