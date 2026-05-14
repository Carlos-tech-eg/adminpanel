import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth, type Role } from "../context/AuthContext";

const nav: { to: string; label: string; end?: boolean; roles: Role[] }[] = [
  { to: "/", label: "Resumen", end: true, roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/registrations", label: "Registros consulares", roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/visas", label: "Visados", roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/appointments", label: "Citas", roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/news", label: "Noticias", roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/media", label: "Medios / imágenes", roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/notices", label: "Avisos oficiales", roles: ["Admin", "Consul", "Press Attaché"] },
  { to: "/audit", label: "Auditoría", roles: ["Admin"] },
];

export default function AppShell() {
  const { user, logout, can } = useAuth();
  const loc = useLocation();
  const [mobileNav, setMobileNav] = useState(false);

  return (
    <div className="flex min-h-full">
      {mobileNav ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileNav(false)}
        />
      ) : null}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-slate-200/80 bg-white shadow-xl backdrop-blur transition-transform duration-200 lg:static lg:shadow-none",
          mobileNav ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        <div className="border-b border-slate-200/80 px-6 py-6">
          <div className="text-xs font-bold uppercase tracking-wider text-emb-secondary">Embajada</div>
          <div className="mt-1 text-lg font-extrabold leading-tight text-slate-900">
            Guinea Ecuatorial
          </div>
          <div className="mt-1 text-xs text-slate-500">Panel de control — Türkiye</div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav
            .filter((n) => can(n.roles))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileNav(false)}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    isActive
                      ? "bg-gradient-to-r from-emb-secondary to-[#064b8f] text-white shadow-md"
                      : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")
                }
              >
                <span className="h-2 w-2 rounded-full bg-current opacity-70" />
                {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="border-t border-slate-200/80 p-4 text-xs text-slate-500">
          Ruta actual: <span className="font-mono text-slate-700">{loc.pathname}</span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-sm lg:hidden"
                onClick={() => setMobileNav((v) => !v)}
                aria-label="Menú"
              >
                ☰
              </button>
              <div className="min-w-0">
              <div className="truncate text-sm font-extrabold text-slate-900">
                Centro de gestión consular
              </div>
              <div className="truncate text-xs text-slate-500">
                Diseño alineado con el sitio público — colores institucionales
              </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-slate-900">{user?.email}</div>
                <div className="text-xs text-emb-muted">{user?.role}</div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Salir
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
