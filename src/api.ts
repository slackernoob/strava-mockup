const USER_KEY = "runclub.userId";

function readStoredUserId(): number | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY);
    const id = Number(raw);
    return raw && Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// The identity used on requests lives in memory so it can never diverge from
// the user the UI is showing. sessionStorage only re-hydrates it on reload;
// being per-tab, it can't bleed between tabs the way localStorage does.
let currentUserId: number | null = readStoredUserId();

export function getCurrentUserId(): number | null {
  return currentUserId;
}

export function setCurrentUserId(id: number | null): void {
  currentUserId = id;
  try {
    if (id === null) sessionStorage.removeItem(USER_KEY);
    else sessionStorage.setItem(USER_KEY, String(id));
  } catch {
    // storage unavailable — identity just won't survive a reload
  }
}

export class ApiError extends Error {}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (currentUserId) headers["X-User-Id"] = String(currentUserId);
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(`/api${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(data?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}
