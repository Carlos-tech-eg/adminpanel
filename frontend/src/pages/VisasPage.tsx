import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Row = {
  _id: string;
  applicantName: string;
  email: string;
  visaType: string;
  status: string;
  passportNo?: string;
  referenceCode?: string;
};

const STATUSES = ["Received", "In review", "Approved", "Rejected", "Completed"];
const TYPES = ["Tourist", "Business", "Official", "Transit", "Other"];

export default function VisasPage() {
  const { can } = useAuth();
  const write = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    applicantName: "",
    email: "",
    visaType: "Tourist",
    passportNo: "",
  });

  const load = useMemo(
    () => async () => {
      setErr(null);
      try {
        const res = await api<{ data: Row[] }>("/api/visa-applications");
        setRows(res.data);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Error");
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    await api("/api/visa-applications", {
      method: "POST",
      json: {
        applicantName: form.applicantName,
        email: form.email,
        visaType: form.visaType,
        passportNo: form.passportNo,
      },
    });
    setModal(false);
    setForm({ applicantName: "", email: "", visaType: "Tourist", passportNo: "" });
    await load();
  }

  async function patch(id: string, status: string) {
    await api(`/api/visa-applications/${id}`, { method: "PATCH", json: { status } });
    await load();
  }

  async function del(id: string) {
    if (!confirm("¿Eliminar esta solicitud?")) return;
    await api(`/api/visa-applications/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Visados</h1>
          <p className="mt-2 text-slate-600">Seguimiento de solicitudes y estados.</p>
        </div>
        {write ? (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="rounded-xl bg-gradient-to-r from-emb-secondary to-[#064b8f] px-5 py-3 text-sm font-extrabold text-white shadow-md"
          >
            Nueva solicitud
          </button>
        ) : null}
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{err}</div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Ref.</th>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.referenceCode || "—"}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{r.applicantName}</div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </td>
                <td className="px-4 py-3">{r.visaType}</td>
                <td className="px-4 py-3">
                  {write ? (
                    <select
                      className="w-full max-w-[180px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                      value={r.status}
                      onChange={(e) => void patch(r._id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    r.status
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {write ? (
                    <button
                      type="button"
                      onClick={() => void del(r._id)}
                      className="text-xs font-bold text-emb-accent hover:underline"
                    >
                      Eliminar
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold">Nueva solicitud de visado</h2>
            <div className="mt-4 space-y-3">
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre completo"
                value={form.applicantName}
                onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Pasaporte (opcional)"
                value={form.passportNo}
                onChange={(e) => setForm({ ...form, passportNo: e.target.value })}
              />
              <select
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.visaType}
                onChange={(e) => setForm({ ...form, visaType: e.target.value })}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
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
                className="rounded-xl bg-emb-primary px-4 py-2 text-sm font-extrabold text-white"
                onClick={() => void create()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
