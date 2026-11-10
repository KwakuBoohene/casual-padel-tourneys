import { useAdminSession } from "../components/admin/AdminSession";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ThemeProvider } from "./ThemeProvider";
import { InstallApp } from "../components/InstallApp";
import { ThemeToggle } from "../components/ThemeToggle";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const admin = useAdminSession();
  return (
    <ThemeProvider>
      <nav
        className="gap-2 px-3 sm:px-6"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: "56px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--color-padel-surface)",
          borderBottom: "1px solid var(--color-padel-border)",
          backdropFilter: "blur(12px)"
        }}
      >
        <Link
          to="/"
          className="min-w-0"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "9px",
            textDecoration: "none",
            color: "var(--color-padel-text)"
          }}
        >
          <svg
            className="shrink-0"
            width="22"
            height="28"
            viewBox="0 0 22 28"
            fill="none"
            aria-hidden="true"
            style={{ color: "var(--color-padel-primary)" }}
          >
            <rect x="1" y="1" width="20" height="17" rx="6" stroke="currentColor" strokeWidth="2" />
            <line
              x1="7.5"
              y1="1"
              x2="7.5"
              y2="18"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.65"
            />
            <line
              x1="11"
              y1="1"
              x2="11"
              y2="18"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.65"
            />
            <line
              x1="14.5"
              y1="1"
              x2="14.5"
              y2="18"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.65"
            />
            <line x1="1" y1="7" x2="21" y2="7" stroke="currentColor" strokeWidth="0.9" strokeOpacity="0.65" />
            <line
              x1="1"
              y1="12"
              x2="21"
              y2="12"
              stroke="currentColor"
              strokeWidth="0.9"
              strokeOpacity="0.65"
            />
            <path
              d="M8.5 18 L8 26 Q11 27.5 14 26 L13.5 18"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="truncate" style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.01em" }}>Casual Tourneys</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2 sm:gap-5">
          <InstallApp />
          {admin.status === "allowed" ? (
            <Link to="/admin" className="text-sm font-semibold text-padel-primary">
              Admin
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </nav>

      {children}
    </ThemeProvider>
  );
}
