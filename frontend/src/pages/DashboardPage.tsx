import { useEffect, useState } from "react";
import { api } from "../lib/api";

type Stats = {
  visaApplications: { total: number; byStatus: Record<string, number> };
  consularRegistrations: { total: number; byStatus: Record<string, number> };
  appointments: { byStatus: Record<string, number> };
  content: { publishedNews: number; mediaAssets: number; notices: number };
};

function StatCard({
  title,
  value,
  hint,
  tone,
}: {
  title: string;
  value: string | number;
  hint?: string;
  tone: "green" | "blue" | "slate" | "red";
}) {
  const ring =
    tone === "green"
      ? "from-emb-primary/20 to-emerald-500/10"
      : tone === "blue"
        ? "from-emb-secondary/20 to-sky-500/10"
        : tone === "red"
          ? "from-emb-accent/15 to-rose-500/10"
          : "from-slate-200 to-slate-100";
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-gradient-to-br ${ring} p-5 shadow-sm`}>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-extrabold text-slate-900">{value}</div>
      {hint ? <div className="mt-2 text-xs text-slate-600">{hint}</div> : null}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api<{ data: Stats }>("/api/dashboard/stats");
        if (!cancelled) setStats(res.data);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    const authRelated =
      /invalid or expired token|user no longer exists|missing or invalid authorization/i.test(err);
    const hint = authRelated
      ? "Vuelva a iniciar sesión. Suele ocurrir si el token caducó (8 h), cambió JWT_SECRET en .env, o mezcló URLs (p. ej. localhost frente a 127.0.0.1) — use siempre la misma dirección para el panel."
      : "Compruebe que el API está en marcha. Con Vite (`npm run dev:ui`), el proxy usa PORT de `admin-panel/.env` automáticamente.";
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        {err} — {hint}
      </div>
    );
  }

  if (!stats) {
    return <div className="text-sm text-slate-600">Cargando métricas…</div>;
  }

  const apptTotal = Object.values(stats.appointments.byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Resumen</h1>
        <p className="mt-2 max-w-3xl text-slate-600">
          Vista general de solicitudes de visado, registros consulares, citas y contenidos publicados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Visados (total)" value={stats.visaApplications.total} tone="blue" />
        <StatCard title="Registros consulares" value={stats.consularRegistrations.total} tone="green" />
        <StatCard title="Citas" value={apptTotal} hint="Por estado en la sección Citas." tone="slate" />
        <StatCard title="Noticias publicadas" value={stats.content.publishedNews} tone="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Visados por estado</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {Object.entries(stats.visaApplications.byStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4">
                <span>{k}</span>
                <span className="font-bold">{v}</span>
              </li>
            ))}
            {Object.keys(stats.visaApplications.byStatus).length === 0 ? (
              <li className="text-slate-500">Sin datos.</li>
            ) : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">Registros por estado</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-700">
            {Object.entries(stats.consularRegistrations.byStatus).map(([k, v]) => (
              <li key={k} className="flex justify-between gap-4">
                <span>{k}</span>
                <span className="font-bold">{v}</span>
              </li>
            ))}
            {Object.keys(stats.consularRegistrations.byStatus).length === 0 ? (
              <li className="text-slate-500">Sin datos.</li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-slate-900">Contenido</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">Medios</div>
            <div className="mt-1 text-2xl font-extrabold">{stats.content.mediaAssets}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">Avisos</div>
            <div className="mt-1 text-2xl font-extrabold">{stats.content.notices}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-bold uppercase text-slate-500">Citas (estados)</div>
            <div className="mt-2 space-y-1 text-xs text-slate-700">
              {Object.entries(stats.appointments.byStatus).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
