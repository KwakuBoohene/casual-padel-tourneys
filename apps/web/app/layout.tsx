import type { ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@padel/shared";

import { ThemeProvider } from "./ThemeProvider";
import "./globals.css";

export const metadata = {
  title: "Casual Padel Tourneys",
  description: "Live Americano & Mexicano padel viewer for Casual Padel Tourneys."
};

const themeInitScript = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.dataset.theme=m==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="min-h-screen bg-padel-background text-padel-text antialiased font-display pt-14">
        {/* Navbar */}
        <nav
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
            padding: "0 24px",
            background: "var(--color-padel-surface)",
            borderBottom: "1px solid var(--color-padel-border)",
            backdropFilter: "blur(12px)"
          }}
        >
          {/* Brand */}
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "9px",
              textDecoration: "none",
              color: "var(--color-padel-text)"
            }}
          >
            {/* Padel racket logo */}
            <svg
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
              <line
                x1="1"
                y1="7"
                x2="21"
                y2="7"
                stroke="currentColor"
                strokeWidth="0.9"
                strokeOpacity="0.65"
              />
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
            <span style={{ fontWeight: 700, fontSize: "15px", letterSpacing: "-0.01em" }}>
              Casual Tourneys
            </span>
          </a>

          {/* Theme toggle — icon only */}
          <button
            id="theme-switch"
            type="button"
            aria-label="Switch to light mode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "9999px",
              border: "1px solid var(--color-padel-border)",
              background: "transparent",
              color: "var(--color-padel-text)",
              cursor: "pointer",
              flexShrink: 0
            }}
          >
            {/* Sun — shown when in dark mode (click → go light) */}
            <span id="theme-icon-sun" aria-hidden="true" style={{ display: "inline-flex" }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </span>
            {/* Moon — shown when in light mode (click → go dark) */}
            <span id="theme-icon-moon" aria-hidden="true" style={{ display: "none" }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </span>
          </button>
        </nav>

        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  const key = "padel:web:theme";
  const root = document.documentElement;
  const btn = document.getElementById("theme-switch");
  const sunIcon = document.getElementById("theme-icon-sun");
  const moonIcon = document.getElementById("theme-icon-moon");
  if (!btn || !sunIcon || !moonIcon) return;

  const getTheme = () => {
    const stored = window.localStorage.getItem(key);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    const isLight = theme === "light";
    root.setAttribute("data-theme", theme);
    btn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
    sunIcon.style.display = isLight ? "none" : "inline-flex";
    moonIcon.style.display = isLight ? "inline-flex" : "none";
  };

  let theme = getTheme();
  applyTheme(theme);
  window.localStorage.setItem(key, theme);

  btn.addEventListener("click", () => {
    theme = theme === "dark" ? "light" : "dark";
    applyTheme(theme);
    window.localStorage.setItem(key, theme);
  });
})();`
          }}
        />
        {children}
      </body>
    </html>
  );
}
