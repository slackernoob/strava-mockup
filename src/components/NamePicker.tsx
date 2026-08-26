import type { User } from "../types";
import { avatarColor } from "../util";

export function NamePicker({ users, onPick }: { users: User[]; onPick: (id: number) => void }) {
  return (
    <div className="app picker">
      <h1>🏃 Run Club</h1>
      <p className="muted">Who's running today?</p>
      <div className="name-grid">
        {users.map((u) => (
          <button key={u.id} className="name-card" onClick={() => onPick(u.id)}>
            <span className="avatar" style={{ background: avatarColor(u.id) }}>
              {u.name[0]}
            </span>
            {u.name}
          </button>
        ))}
      </div>
    </div>
  );
}
