import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Notice = {
  _id: string;
  title: string;
  category: string;
  publishedDate: string;
  priority: boolean;
};

const CATS = ["Visa", "Travel Advisory", "Embassy News", "Emergency"];

export default function NoticesPage() {
  const { can } = useAuth();
  const add = can(["Admin", "Consul", "Press Attaché"]);
  const remove = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Notice[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Embassy News");
  const [priority, setPriority] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Notice[] }>("/api/notices");
      setRows(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    await api("/api/notices", {
      method: "POST",
      json: { title, content, category, priority },
    });
    setModal(false);
    setTitle("");
    setContent("");
    setCategory("Embassy News");
    setPriority(false);
    await load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar aviso?")) return;
    await api(`/api/notices/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Avisos oficiales</h1>
          <p className="mt-2 text-slate-600">Avisos consulares, viajes y emergencias.</p>
        </div>
        {add ? (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="rounded-xl bg-gradient-to-r from-emb-accent to-rose-700 px-5 py-3 text-sm font-extrabold text-white shadow-md"
          >
            Nuevo aviso
          </button>
        ) : null}
      </div>
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="space-y-3">
        {rows.map((n) => (
          <div
            key={n._id}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div className="text-xs font-bold uppercase text-emb-secondary">{n.category}</div>
              <div className="mt-1 text-lg font-extrabold text-slate-900">{n.title}</div>
              <div className="mt-1 text-xs text-slate-500">
                {new Date(n.publishedDate).toLocaleString()} · Prioridad:{" "}
                {n.priority ? "Sí" : "No"}
              </div>
            </div>
            {remove ? (
              <button
                type="button"
                className="self-start rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-emb-accent"
                onClick={() => void del(n._id)}
              >
                Eliminar
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold">Nuevo aviso</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <textarea
                className="min-h-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Contenido"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={priority} onChange={(e) => setPriority(e.target.checked)} />
                Prioridad alta
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                onClick={() => setModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-emb-secondary px-4 py-2 text-sm font-extrabold text-white"
                onClick={() => void create()}
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
