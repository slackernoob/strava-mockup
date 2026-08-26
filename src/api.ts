const USER_KEY = "runclub.userId";

export function getStoredUserId(): number | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    const id = Number(raw);
    return raw && Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function storeUserId(id: number | null): void {
  try {
    if (id === null) localStorage.removeItem(USER_KEY);
    else localStorage.setItem(USER_KEY, String(id));
  } catch {
    // storage unavailable — identity just won't persist across reloads
  }
}

export class ApiError extends Error {}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const userId = getStoredUserId();
  if (userId) headers["X-User-Id"] = String(userId);
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
