import { Link, Outlet } from "react-router";

import { paths } from "@/config/paths";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-muted text-foreground">
      <header className="bg-primary text-primary-foreground">
        <nav className="flex items-center gap-6 px-6 py-3">
          <span className="text-sm font-semibold uppercase tracking-wide">
            Admin
          </span>
          <Link to={paths.admin.dashboard.getHref()} className="text-sm">
            Dashboard
          </Link>
        </nav>
      </header>
      <main className="px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
