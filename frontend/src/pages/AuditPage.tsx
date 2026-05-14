import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Log = {
  _id: string;
  action: string;
  userEmail: string;
  role: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  createdAt: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ data: Log[] }>("/api/audit-logs");
        if (!cancelled) setRows(res.data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        {err} — Solo <span className="font-semibold">Admin</span> puede ver auditoría.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Auditoría</h1>
        <p className="mt-2 text-slate-600">Registro de acciones sensibles en el panel.</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Usuario</th>
              <th className="px-3 py-2">Acción</th>
              <th className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-slate-50/60">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-900">{r.userEmail}</div>
                  <div className="text-slate-500">{r.role}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-800">{r.action}</td>
                <td className="px-3 py-2 text-slate-600">{r.details || r.targetId || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
