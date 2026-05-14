import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";

type Inquiry = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  source?: string;
  createdAt?: string;
};

function fmtDate(value?: string) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function ContactInquiriesPage() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Inquiry[] }>("/api/contact-inquiries");
      setRows(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Mensajes web</h1>
        <p className="mt-2 text-slate-600">
          Consultas enviadas desde el formulario de contacto del sitio publico.
        </p>
      </div>

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">Asunto</th>
              <th className="px-4 py-3">Mensaje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r._id} className="align-top hover:bg-slate-50/60">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {fmtDate(r.createdAt)}
                  <div className="mt-1 font-mono text-[11px] text-slate-400">{r.source || "website"}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">{r.fullName}</div>
                  <a className="text-xs text-emb-secondary hover:underline" href={`mailto:${r.email}`}>
                    {r.email}
                  </a>
                  {r.phone ? <div className="mt-1 text-xs text-slate-500">{r.phone}</div> : null}
                </td>
                <td className="max-w-[220px] px-4 py-3 text-slate-700">{r.subject || "-"}</td>
                <td className="max-w-xl whitespace-pre-wrap px-4 py-3 text-slate-700">{r.message}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No hay mensajes todavia.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
