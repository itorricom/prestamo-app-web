import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive
    ? 'rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-semibold text-brand-700 sm:px-3.5'
    : 'rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 sm:px-3.5';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-svh bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-5">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-lg text-white">
                💰
              </div>
              <span className="hidden text-[15px] font-semibold tracking-tight text-slate-900 md:block">
                Préstamo App
              </span>
            </div>
            <nav className="flex items-center gap-1">
              <NavLink to="/clientes" className={navLinkClass}>
                Clientes
              </NavLink>
              <NavLink to="/prestamos" className={navLinkClass}>
                Préstamos
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <span className="hidden text-sm text-slate-500 lg:block">{user.email}</span>
            )}
            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-sm font-medium text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
