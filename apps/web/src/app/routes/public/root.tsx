import { Link, Outlet } from "react-router";

import { paths } from "@/config/paths";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to={paths.home.getHref()} className="font-semibold">
            Portfolio
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
