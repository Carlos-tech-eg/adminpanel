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
  citizenStatus?: string;
  receiptUrl?: string;
  sourceFolderId?: string;
  photoDataUrl?: string;
  source?: string;
  createdAt?: string;
  updatedAt?: string;
};

const STATUSES = ["New", "In review", "Registered", "Rejected", "Archived"];

const CITIZEN_LABEL: Record<string, string> = {
  student: "Estudiante",
  worker: "Trabajador",
  resident: "Residente",
  tourist: "Turista",
  other: "Otro",
};

function formatWhen(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function RegistrationsPage() {
  const { can } = useAuth();
  const write = can(["Admin", "Consul"]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Row | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setErr(null);
    try {
      const res = await api<{ data: Row[] }>("/api/consular-registration");
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
    setDetail((d) => (d && d._id === id ? { ...d, status } : d));
  }

  async function openDetail(row: Row) {
    try {
      const res = await api<{ data: Row }>(`/api/consular-registrations/${row._id}`);
      setDetail(res.data);
    } catch {
      setDetail(row);
    }
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

  const search = query.trim().toLowerCase();
  const filteredRows = search
    ? rows.filter((r) =>
        [
          r.referenceCode,
          r.fullName,
          r.email,
          r.phone,
          r.passportNo,
          r.country,
          r.city,
          r.status,
          r.citizenStatus,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search))
      )
    : rows;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">
          Registros consulares
        </h1>
        <p className="mt-2 text-slate-600">
          Envíos desde el sitio web (MongoDB). Datos reales, sin simulaciones.
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
        <label
          htmlFor="registration-search"
          className="text-xs font-bold uppercase tracking-wide text-slate-500"
        >
          Buscar registro
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            id="registration-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ej. REG-2026-L53XQS, nombre, email, pasaporte..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emb-secondary focus:ring-2 focus:ring-emb-secondary/15"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Limpiar
            </button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {filteredRows.length} de {rows.length} registros
        </p>
      </div>
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {err}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Ref.</th>
                <th className="px-4 py-3">Nombre / Email</th>
                <th className="px-4 py-3">País</th>
                <th className="px-4 py-3">Ciudad</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Enviado</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((r) => (
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
                  <td className="px-4 py-3 text-slate-700">
                    {r.country || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.city || "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {r.citizenStatus
                      ? CITIZEN_LABEL[r.citizenStatus] || r.citizenStatus
                      : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-600">
                    {formatWhen(r.createdAt)}
                  </td>
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
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => void openDetail(r)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Ver detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => void downloadPDF(r)}
                        className="inline-flex items-center justify-center rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
                        title="PDF resumen (generado en el panel)"
                      >
                        PDF
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredRows.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-slate-500"
                  >
                    No se encontraron registros con esa búsqueda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {detail ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-detail-title"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="reg-detail-title"
                className="text-lg font-bold text-slate-900"
              >
                Detalle del registro
              </h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-slate-500">Referencia</dt>
                <dd className="font-mono text-slate-900">
                  {detail.referenceCode || "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Nombre</dt>
                <dd className="text-slate-900">{detail.fullName}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Email</dt>
                <dd className="text-slate-900">{detail.email}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Teléfono</dt>
                <dd className="text-slate-900">{detail.phone || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Pasaporte</dt>
                <dd className="text-slate-900">{detail.passportNo || "—"}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">País / Ciudad</dt>
                <dd className="text-slate-900">
                  {[detail.country, detail.city].filter(Boolean).join(" · ") ||
                    "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">
                  Tipo de ciudadano
                </dt>
                <dd className="text-slate-900">
                  {detail.citizenStatus
                    ? CITIZEN_LABEL[detail.citizenStatus] ||
                      detail.citizenStatus
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Estado trámite</dt>
                <dd className="text-slate-900">{detail.status}</dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-500">Enviado</dt>
                <dd className="text-slate-900">
                  {formatWhen(detail.createdAt)}
                </dd>
              </div>
              {detail.sourceFolderId ? (
                <div>
                  <dt className="font-semibold text-slate-500">ID carpeta (web)</dt>
                  <dd className="break-all font-mono text-xs text-slate-700">
                    {detail.sourceFolderId}
                  </dd>
                </div>
              ) : null}
              {detail.receiptUrl ? (
                <div>
                  <dt className="font-semibold text-slate-500">
                    Recibo / archivos en sitio público
                  </dt>
                  <dd>
                    <a
                      href={detail.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-green-700 underline"
                    >
                      {detail.receiptUrl}
                    </a>
                    <p className="mt-1 text-xs text-slate-500">
                      PDF y documentos subidos se guardan en el servidor del sitio
                      público; este enlace permite abrirlos.
                    </p>
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="font-semibold text-slate-500">Notas / resumen</dt>
                <dd className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-slate-800">
                  {detail.notes?.trim() || "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : null}
    </div>
  );
}
