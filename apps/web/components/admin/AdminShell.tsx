import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useThemeMode } from "../../app/ThemeProvider";
import { adminLink } from "../../lib/admin/reportFilters";
import { AdminIcon } from "./AdminIcon";
import { SentryLink } from "./SentryLink";

const reports = [
  { kind: "overview", path: "/admin", label: "Overview", icon: "overview" },
  { kind: "viewer", path: "/admin/viewer", label: "Viewer traffic", icon: "viewer" },
  { kind: "organizer", path: "/admin/organizer", label: "Organizer usage", icon: "organizer" },
  { kind: "tournaments", path: "/admin/tournaments", label: "Tournaments", icon: "tournaments" },
  { kind: "users", path: "/admin/users", label: "Accounts", icon: "accounts" },
  { kind: "activity", path: "/admin/activity", label: "Activity", icon: "activity" }
] as const;

type AdminSection = (typeof reports)[number]["kind"];

const sidebarAction =
  "flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[0.875rem] text-padel-muted no-underline " +
  "hover:bg-(--admin-accent-surface) hover:text-padel-text";
const reportLink =
  `${sidebarAction} aria-[current=page]:bg-(--admin-accent-surface) aria-[current=page]:font-bold ` +
  "aria-[current=page]:text-padel-text aria-[current=page]:[box-shadow:inset_3px_0_var(--color-padel-primary)]";

export function AdminShell({
  navigation,
  signOut,
  children
}: {
  navigation?: { kind: AdminSection; range: URLSearchParams; fallback: URLSearchParams };
  signOut(): void;
  children: ReactNode;
}) {
  const { mode, toggleMode } = useThemeMode();
  const section = reports.find((report) => report.kind === navigation?.kind);
  const isDay = mode === "light";
  return (
    <div className="admin-workspace grid min-h-screen grid-cols-1 bg-padel-background text-padel-text md:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="flex flex-col overflow-y-auto border-b border-padel-border bg-(--admin-rail) px-4 pt-3 md:sticky md:top-0 md:h-dvh md:border-e md:border-b-0 md:px-4.5 md:py-5.5">
        <div className="mx-1 flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-[0.625rem] bg-(--admin-brand)">
            <AdminIcon name="brand" />
          </span>
          <div>
            <p className="text-[1.0625rem] leading-[1.2] font-bold">Casual Padel</p>
            <p className="admin-eyebrow text-padel-muted">Admin workspace</p>
          </div>
        </div>
        {navigation ? (
          <nav className="mt-3 mb-1 md:mt-11 md:mb-0" aria-label="Admin reports">
            <p className="admin-eyebrow mb-2 ml-2 hidden text-padel-muted md:block">Workspace</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-0.5 md:grid-cols-none">
              {reports.map(({ kind, path, label, icon }) => (
                <Link
                  key={kind}
                  className={reportLink}
                  aria-current={navigation.kind === kind ? "page" : undefined}
                  to={adminLink(
                    path,
                    (kind === "overview" || kind === "viewer" || kind === "organizer") && navigation.range.get("period") === "all"
                      ? navigation.fallback
                      : navigation.range
                  )}
                >
                  <AdminIcon name={icon} />
                  {label}
                </Link>
              ))}
              <SentryLink className={sidebarAction} icon={<AdminIcon name="health" />} />
            </div>
          </nav>
        ) : null}
        <div className="mt-auto flex justify-between border-t border-padel-border max-md:gap-2 md:grid md:justify-stretch md:pt-3">
          <Link className={`${sidebarAction} justify-between`} to="/">
            Back to Viewer <AdminIcon name="external" />
          </Link>
          <button className={sidebarAction} type="button" onClick={signOut}>Sign out</button>
        </div>
      </aside>
      <div>
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-padel-border px-[clamp(1rem,2.1vw,2rem)] py-2 text-[0.8125rem] text-padel-muted md:min-h-17">
          <p>
            Workspace {section ? (
              <><span aria-hidden="true"> / </span><strong className="text-padel-text">{section.label}</strong></>
            ) : null}
          </p>
          <button
            className="admin-control shrink-0 gap-1.5"
            type="button"
            role="switch"
            aria-checked={isDay}
            aria-label={isDay ? "Switch to night mode" : "Switch to day mode"}
            onClick={toggleMode}
          >
            <AdminIcon name="theme" />
            {isDay ? "Day mode" : "Night mode"}
          </button>
        </header>
        <main className="mx-auto grid max-w-[100rem] gap-4 px-[clamp(1rem,2.1vw,2rem)] pt-6 pb-12 *:min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
