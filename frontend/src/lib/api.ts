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
    let msg = err.error || `HTTP ${res.status}`;
    const d = err.details;
    if (Array.isArray(d) && d.length) {
      const parts = d.map((x) => {
        if (typeof x === "object" && x !== null && "msg" in x) return String((x as { msg: string }).msg);
        try {
          return JSON.stringify(x);
        } catch {
          return String(x);
        }
      });
      msg += ` (${parts.join("; ")})`;
    } else if (typeof d === "string" && d.trim()) {
      msg += ` (${d.trim()})`;
    }
    throw new Error(msg);
  }
  return data as T;
}

const MAX_IMAGE_UPLOAD_BYTES = 1.8 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1800;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("No se pudo preparar la imagen"));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_IMAGE_UPLOAD_BYTES) return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.82;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob.size > MAX_IMAGE_UPLOAD_BYTES && quality > 0.55) {
      quality -= 0.08;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    const name = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    bitmap.close();
  }
}

export async function uploadMedia(file: File, alt?: string, category?: string) {
  const token = getToken();
  const uploadFile = await compressImageForUpload(file);
  const fd = new FormData();
  fd.append("file", uploadFile);
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
