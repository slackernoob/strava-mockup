import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import type { Club } from "../types";

export function Clubs({
  onOpen,
  onError,
}: {
  onOpen: (clubId: number) => void;
  onError: (message: string) => void;
}) {
  const [clubs, setClubs] = useState<Club[] | null>(null);
  const [name, setName] = useState("");

  const load = useCallback(() => {
    api<Club[]>("/clubs")
      .then(setClubs)
      .catch((e: Error) => onError(e.message));
  }, [onError]);

  useEffect(load, [load]);

  const createClub = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const club = await api<{ id: number }>("/clubs", { method: "POST", body: { name } });
      setName("");
      onOpen(club.id);
    } catch (err) {
      onError((err as Error).message);
    }
  };

  const toggleMembership = async (club: Club) => {
    try {
      await api(`/clubs/${club.id}/membership`, {
        method: club.is_member ? "DELETE" : "POST",
      });
      load();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  if (!clubs) return <p className="muted">Loading clubs…</p>;

  return (
    <div>
      <form className="inline-form" onSubmit={createClub}>
        <input
          placeholder="Start a new club…"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          Create
        </button>
      </form>
      {clubs.length === 0 && <p className="muted">No clubs yet — start the first one.</p>}
      <div className="cards">
        {clubs.map((club) => (
          <div className="card club-row" key={club.id} onClick={() => onOpen(club.id)}>
            <div>
              <h3>{club.name}</h3>
              <p className="muted">
                {club.member_count} member{club.member_count === 1 ? "" : "s"} · started by{" "}
                {club.creator_name}
              </p>
            </div>
            <button
              className={club.is_member ? "btn" : "btn primary"}
              onClick={(e) => {
                e.stopPropagation();
                void toggleMembership(club);
              }}
            >
              {club.is_member ? "Leave" : "Join"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
