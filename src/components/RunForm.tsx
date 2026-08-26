import { useState, type FormEvent } from "react";
import { api } from "../api";
import type { RunSummary } from "../types";

function toLocalInput(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RunForm({
  clubId,
  run,
  onSaved,
  onCancel,
  onError,
}: {
  clubId: number;
  run: RunSummary | null;
  onSaved: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}) {
  const [title, setTitle] = useState(run?.title ?? "");
  const [startsAt, setStartsAt] = useState(run ? toLocalInput(run.starts_at) : "");
  const [location, setLocation] = useState(run?.location ?? "");
  const [distance, setDistance] = useState(run?.distance_km?.toString() ?? "");
  const [pace, setPace] = useState(run?.pace ?? "");
  const [description, setDescription] = useState(run?.description ?? "");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startsAt) {
      onError("Pick a start time.");
      return;
    }
    try {
      const body = {
        title,
        starts_at: new Date(startsAt).toISOString(),
        location,
        distance_km: distance.trim() === "" ? null : Number(distance),
        pace,
        description,
      };
      if (run) {
        await api(`/runs/${run.id}`, { method: "PATCH", body });
      } else {
        await api(`/clubs/${clubId}/runs`, { method: "POST", body });
      }
      onSaved();
    } catch (err) {
      onError((err as Error).message);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      <label>
        Title
        <input
          value={title}
          maxLength={80}
          required
          placeholder="Saturday Long Run"
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="form-row">
        <label>
          Starts at
          <input
            type="datetime-local"
            value={startsAt}
            min={toLocalInput(Math.floor(Date.now() / 1000))}
            required
            onChange={(e) => setStartsAt(e.target.value)}
          />
        </label>
        <label>
          Distance (km)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={distance}
            placeholder="10"
            onChange={(e) => setDistance(e.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Meeting point
          <input
            value={location}
            placeholder="Bedok Reservoir carpark B"
            onChange={(e) => setLocation(e.target.value)}
          />
        </label>
        <label>
          Pace
          <input
            value={pace}
            placeholder="6:00/km, no-drop"
            onChange={(e) => setPace(e.target.value)}
          />
        </label>
      </div>
      <label>
        Notes
        <textarea
          value={description}
          rows={2}
          placeholder="Route, what to bring…"
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn primary">
          {run ? "Save changes" : "Schedule run"}
        </button>
      </div>
    </form>
  );
}
