import { useCallback, useEffect, useState } from "react";
import { api, uploadMedia } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Article = {
  _id: string;
  title: string;
  excerpt: string;
  content: string;
  dateLabel: string;
  badgeLabel: string;
  badgeTone: string;
  imageUrl: string;
  published: boolean;
  href: string;
};

const COVER_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

function validateCoverFile(f: File): string | null {
  if (!COVER_MIME.has(f.type)) return "Solo JPG, PNG o WEBP";
  if (f.size > 12 * 1024 * 1024) return "Máximo 12 MB";
  return null;
}

export default function NewsPage() {
  const { can } = useAuth();
  const edit = can(["Admin", "Consul", "Press Attaché"]);
  const del = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Article[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<Partial<Article>>({
    title: "",
    excerpt: "",
    content: "",
    dateLabel: "",
    badgeLabel: "Noticia",
    badgeTone: "green",
    imageUrl: "",
    href: "/noticias",
    published: true,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [modalErr, setModalErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Article[] }>("/api/news");
      setRows(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function resetCover() {
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(null);
    setCoverPreview(null);
  }

  function openNew() {
    setEditing(null);
    resetCover();
    setModalErr(null);
    setForm({
      title: "",
      excerpt: "",
      content: "",
      dateLabel: new Date().toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      badgeLabel: "Noticia",
      badgeTone: "green",
      imageUrl: "",
      href: "/noticias",
      published: true,
    });
    setModal(true);
  }

  function openEdit(a: Article) {
    setEditing(a);
    resetCover();
    setModalErr(null);
    setForm({ ...a });
    setModal(true);
  }

  function onPickCover(file: File | null) {
    setModalErr(null);
    if (!file) {
      resetCover();
      return;
    }
    const v = validateCoverFile(file);
    if (v) {
      setModalErr(v);
      return;
    }
    if (coverPreview?.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }

  async function save() {
    setModalErr(null);
    setSaving(true);
    try {
      let imageUrl = (form.imageUrl || "").trim();
      if (coverFile) {
        const up = await uploadMedia(coverFile, form.title?.trim() || "portada", "news");
        imageUrl = up.data.publicUrl;
      }
      const payload = { ...form, imageUrl };
      if (editing) {
        await api(`/api/news/${editing._id}`, { method: "PATCH", json: payload });
      } else {
        await api("/api/news", { method: "POST", json: payload });
      }
      setModal(false);
      resetCover();
      await load();
    } catch (e) {
      setModalErr(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar noticia?")) return;
    await api(`/api/news/${id}`, { method: "DELETE" });
    await load();
  }

  const previewSrc = (coverPreview || form.imageUrl || "").trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Noticias</h1>
          <p className="mt-2 text-slate-600">
            Portada, texto y publicación. Las imágenes se guardan en el almacenamiento del panel
            (<span className="font-mono">/media-files/…</span>).
          </p>
        </div>
        {edit ? (
          <button
            type="button"
            onClick={openNew}
            className="rounded-xl bg-gradient-to-r from-emb-secondary to-[#064b8f] px-5 py-3 text-sm font-extrabold text-white shadow-md"
          >
            Nueva noticia
          </button>
        ) : null}
      </div>
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((a) => (
          <div
            key={a._id}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm"
          >
            <div className="aspect-[16/9] bg-slate-100">
              {a.imageUrl?.trim() ? (
                <img
                  src={a.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-xs font-semibold text-slate-600">
                  Sin portada
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="text-xs font-bold uppercase text-emb-secondary">{a.badgeLabel}</div>
              <h3 className="mt-2 text-lg font-extrabold text-slate-900">{a.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{a.excerpt}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {edit ? (
                  <button
                    type="button"
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
                    onClick={() => openEdit(a)}
                  >
                    Editar
                  </button>
                ) : null}
                {del ? (
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-emb-accent"
                    onClick={() => void remove(a._id)}
                  >
                    Eliminar
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold">{editing ? "Editar noticia" : "Nueva noticia"}</h2>

            <div className="mt-4 space-y-3">
              <div>
                <p className="mb-1 text-xs font-bold uppercase text-slate-500">Imagen de portada</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="aspect-video w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:w-72">
                    {previewSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element -- preview blob or remote URL
                      <img
                        src={previewSrc}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex h-full min-h-[120px] items-center justify-center px-3 text-center text-xs text-slate-500">
                        Elija una imagen o indique una URL abajo
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      className="block w-full text-sm"
                      onChange={(e) => onPickCover(e.target.files?.[0] ?? null)}
                    />
                    {coverFile ? (
                      <button
                        type="button"
                        className="text-xs font-semibold text-emb-secondary underline"
                        onClick={() => onPickCover(null)}
                      >
                        Quitar archivo (mantener URL abajo si la hay)
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Título"
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Fecha (texto, ej. 10 de mayo, 2026)"
                value={form.dateLabel || ""}
                onChange={(e) => setForm({ ...form, dateLabel: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Etiqueta (ej. Noticia)"
                value={form.badgeLabel || ""}
                onChange={(e) => setForm({ ...form, badgeLabel: e.target.value })}
              />
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.badgeTone || "green"}
                onChange={(e) => setForm({ ...form, badgeTone: e.target.value })}
              >
                {["green", "blue", "red", "neutral"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="URL de imagen manual (opcional; p. ej. https://… o /media-files/…)"
                value={form.imageUrl || ""}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Enlace (ej. /noticias)"
                value={form.href || ""}
                onChange={(e) => setForm({ ...form, href: e.target.value })}
              />
              <textarea
                className="min-h-[70px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Extracto"
                value={form.excerpt || ""}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
              <textarea
                className="min-h-[160px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Contenido (HTML permitido)"
                value={form.content || ""}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.published)}
                  onChange={(e) => setForm({ ...form, published: e.target.checked })}
                />
                Publicada
              </label>
            </div>

            {modalErr ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{modalErr}</div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                onClick={() => {
                  setModal(false);
                  resetCover();
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                className="rounded-xl bg-emb-primary px-4 py-2 text-sm font-extrabold text-white disabled:opacity-50"
                onClick={() => void save()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
