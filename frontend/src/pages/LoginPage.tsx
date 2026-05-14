import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, token, ready } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!ready) return null;
  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-xl backdrop-blur">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-wider text-emb-secondary">
            Acceso seguro
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Panel de la Embajada</h1>
          <p className="mt-2 text-sm text-slate-600">
            Guinea Ecuatorial en Türkiye — gestión de contenidos, citas y trámites.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Correo
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-emb-secondary/20 focus:ring-4"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Contraseña
            </label>
            <input
              type="password"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none ring-emb-secondary/20 focus:ring-4"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {err ? <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-emb-secondary to-[#064b8f] py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-105 disabled:opacity-50"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
          <p className="text-center text-xs text-slate-500">
            Cuentas del personal de la embajada. Si no tiene acceso, contacte con el administrador del sistema.
          </p>
        </form>
      </div>
    </div>
  );
}
