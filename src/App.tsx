import { useCallback, useEffect, useRef, useState } from "react";
import { api, getStoredUserId, storeUserId } from "./api";
import type { User } from "./types";
import { avatarColor } from "./util";
import { NamePicker } from "./components/NamePicker";
import { Feed } from "./components/Feed";
import { Clubs } from "./components/Clubs";
import { ClubDetail } from "./components/ClubDetail";

type Tab = "feed" | "clubs";

export default function App() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [userId, setUserId] = useState<number | null>(getStoredUserId());
  const [tab, setTab] = useState<Tab>("feed");
  const [clubId, setClubId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    api<User[]>("/users")
      .then(setUsers)
      .catch((e: Error) => setError(e.message));
  }, []);

  const showError = useCallback((message: string) => {
    setError(message);
    window.clearTimeout(errorTimer.current);
    errorTimer.current = window.setTimeout(() => setError(null), 4000);
  }, []);

  const pickUser = (id: number | null) => {
    storeUserId(id);
    setUserId(id);
  };

  if (!users) {
    return (
      <div className="app">
        {error && <div className="banner">{error}</div>}
        <p className="muted">Loading…</p>
      </div>
    );
  }

  const currentUser = users.find((u) => u.id === userId) ?? null;
  if (!currentUser) {
    return <NamePicker users={users} onPick={pickUser} />;
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>🏃 Run Club</h1>
        <button className="whoami" title="Switch runner" onClick={() => pickUser(null)}>
          <span className="avatar" style={{ background: avatarColor(currentUser.id) }}>
            {currentUser.name[0]}
          </span>
          {currentUser.name}
        </button>
      </header>
      {error && <div className="banner">{error}</div>}
      <nav className="tabs">
        <button className={tab === "feed" ? "active" : ""} onClick={() => setTab("feed")}>
          Feed
        </button>
        <button
          className={tab === "clubs" ? "active" : ""}
          onClick={() => {
            setTab("clubs");
            setClubId(null);
          }}
        >
          Clubs
        </button>
      </nav>
      <main>
        {tab === "feed" && <Feed currentUserId={currentUser.id} onError={showError} />}
        {tab === "clubs" &&
          (clubId === null ? (
            <Clubs onOpen={setClubId} onError={showError} />
          ) : (
            <ClubDetail
              clubId={clubId}
              currentUserId={currentUser.id}
              onBack={() => setClubId(null)}
              onError={showError}
            />
          ))}
      </main>
    </div>
  );
}
