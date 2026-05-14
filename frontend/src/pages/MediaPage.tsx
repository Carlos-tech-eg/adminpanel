import { useCallback, useEffect, useState } from "react";
import { api, uploadMedia } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Row = {
  _id: string;
  publicUrl: string;
  alt?: string;
  category?: string;
  originalName?: string;
};

export default function MediaPage() {
  const { can } = useAuth();
  const write = can(["Admin", "Consul", "Press Attaché"]);
  const del = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Row[] }>("/api/media");
      setRows(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      await uploadMedia(f, f.name, "site");
      await load();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Upload error");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar archivo?")) return;
    await api(`/api/media/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Biblioteca de medios</h1>
          <p className="mt-2 text-slate-600">
            Suba imágenes y use la URL en noticias (ruta <span className="font-mono">/media-files/…</span>).
          </p>
        </div>
        {write ? (
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-emb-secondary to-[#064b8f] px-5 py-3 text-sm font-extrabold text-white shadow-md">
            {busy ? "Subiendo…" : "Subir imagen"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
          </label>
        ) : null}
      </div>
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((m) => (
          <div
            key={m._id}
            className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm"
          >
            <div className="aspect-video bg-slate-100">
              <img src={m.publicUrl} alt={m.alt || ""} className="h-full w-full object-cover" />
            </div>
            <div className="p-4">
              <div className="break-all font-mono text-xs text-slate-600">{m.publicUrl}</div>
              {del ? (
                <button
                  type="button"
                  className="mt-3 text-xs font-bold text-emb-accent hover:underline"
                  onClick={() => void remove(m._id)}
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
