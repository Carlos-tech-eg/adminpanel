import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

type Row = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  serviceType: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
};

const SERVICES = [
  "Consular registration",
  "Visa",
  "Legalization",
  "Passport",
  "Emergency",
  "Other",
];
const STATUSES = ["Pending", "Confirmed", "Cancelled", "Completed", "No-show"];

export default function AppointmentsPage() {
  const { can } = useAuth();
  const write = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    serviceType: "Visa",
    scheduledAt: "",
    durationMins: 30,
    status: "Pending",
    internalNotes: "",
  });

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Row[] }>("/api/appointments");
      setRows(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    await api("/api/appointments", {
      method: "POST",
      json: {
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      },
    });
    setModal(false);
    setForm({
      fullName: "",
      email: "",
      phone: "",
      serviceType: "Visa",
      scheduledAt: "",
      durationMins: 30,
      status: "Pending",
      internalNotes: "",
    });
    await load();
  }

  async function patch(id: string, patch: Partial<Row>) {
    await api(`/api/appointments/${id}`, { method: "PATCH", json: patch });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Citas consulares</h1>
          <p className="mt-2 text-slate-600">Crear, confirmar y reprogramar citas.</p>
        </div>
        {write ? (
          <button
            type="button"
            onClick={() => setModal(true)}
            className="rounded-xl bg-gradient-to-r from-emb-primary to-emerald-700 px-5 py-3 text-sm font-extrabold text-white shadow-md"
          >
            Nueva cita
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
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Ciudadano</th>
              <th className="px-4 py-3">Servicio</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Duración</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 text-xs text-slate-700">
                  {new Date(r.scheduledAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{r.fullName}</div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </td>
                <td className="px-4 py-3">{r.serviceType}</td>
                <td className="px-4 py-3">
                  {write ? (
                    <select
                      className="w-full max-w-[160px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold"
                      value={r.status}
                      onChange={(e) => void patch(r._id, { status: e.target.value })}
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
                <td className="px-4 py-3">{r.durationMins} min</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-lg font-extrabold">Nueva cita</h2>
            <div className="mt-4 grid gap-3">
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Nombre completo"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Teléfono"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.serviceType}
                onChange={(e) => setForm({ ...form, serviceType: e.target.value })}
              >
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="datetime-local"
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.durationMins}
                onChange={(e) => setForm({ ...form, durationMins: Number(e.target.value) })}
              />
              <textarea
                className="min-h-[90px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Notas internas"
                value={form.internalNotes}
                onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
              />
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
                Crear
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
