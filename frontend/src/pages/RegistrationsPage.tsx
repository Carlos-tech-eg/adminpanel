import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { generateRegistrationPDF } from "../lib/generateRegistrationPDF";

type Row = {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  passportNo?: string;
  status: string;
  city?: string;
  country?: string;
  notes?: string;
  referenceCode?: string;
  createdAt?: string;
};

const STATUSES = ["New", "In review", "Registered", "Rejected", "Archived"];

export default function RegistrationsPage() {
  const { can } = useAuth();
  const write = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Row[] }>("/api/consular-registrations");
      setRows(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, status: string) {
    await api(`/api/consular-registrations/${id}`, {
      method: "PATCH",
      json: { status },
    });
    await load();
  }

  async function downloadPDF(row: Row) {
    try {
      const res = await api<{ data: Row }>(
        `/api/consular-registrations/${row._id}`
      );
      const full = res.data;
      const pdf = generateRegistrationPDF(full);
      const ref = full.referenceCode || full._id.slice(-8);
      pdf.save(`Registro_${ref}.pdf`);
    } catch (e) {
      alert(
        "Error al generar PDF: " +
          (e instanceof Error ? e.message : "Unknown")
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Registros consulares
        </h1>
        <p className="mt-2 text-slate-600">
          Seguimiento y estados de ciudadanos registrados.
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
              <th className="px-4 py-3">Ref.</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-center">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3 font-mono text-xs text-slate-600">
                  {r.referenceCode || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-900">
                    {r.fullName}
                  </div>
                  <div className="text-xs text-slate-500">{r.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{r.city || "—"}</td>
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
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => void downloadPDF(r)}
                    className="inline-flex items-center justify-center rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
                    title="Descargar formulario PDF"
                  >
                    <svg
                      className="mr-1.5 h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
