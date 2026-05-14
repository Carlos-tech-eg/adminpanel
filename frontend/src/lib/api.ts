export const TOKEN_KEY = "emb_admin_token";
export const USER_KEY = "emb_admin_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

/** Clear stored credentials and tell the app to reset auth state (e.g. invalid JWT). */
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("emb-admin-session-expired"));
  }
}

function invalidateSessionIfUnauthorized(status: number) {
  if (status !== 401) return;
  if (!getToken()) return;
  clearSession();
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body = init.body;
  if (init.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(init.json);
  }
  const res = await fetch(path, { ...init, headers, body });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    invalidateSessionIfUnauthorized(res.status);
    const err = data as { error?: string; details?: unknown };
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function uploadMedia(file: File, alt?: string, category?: string) {
  const token = getToken();
  const fd = new FormData();
  fd.append("file", file);
  if (alt) fd.append("alt", alt);
  if (category) fd.append("category", category);
  const res = await fetch("/api/media/upload", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) {
    invalidateSessionIfUnauthorized(res.status);
    throw new Error(data.error || "Upload failed");
  }
  return data as { data: { publicUrl: string; _id: string; alt?: string } };
}
