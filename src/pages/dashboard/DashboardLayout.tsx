import { Link, Outlet, useNavigate } from "react-router-dom";
import { useDashboardAuth } from "../../auth";

export default function DashboardLayout() {
  const { signOut } = useDashboardAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="text-sm font-semibold tracking-wide text-slate-900">
            REVENUE VERIFY
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
              Merchants
            </Link>
            <Link
              to="/dashboard/invite"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 font-medium text-white hover:bg-indigo-700"
            >
              Invite merchant
            </Link>
            <button
              onClick={() => {
                signOut();
                navigate("/dashboard/sign-in");
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
