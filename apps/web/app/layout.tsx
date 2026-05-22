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
      <body className="min-h-screen bg-padel-background text-padel-text antialiased font-display">
        <div
          id="theme-switch-root"
          style={{ position: "fixed", right: "16px", bottom: "16px", zIndex: 2147483647 }}
        >
          <button
            id="theme-switch"
            type="button"
            role="switch"
            aria-checked="false"
            aria-label="Switch to light mode"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              borderRadius: "9999px",
              border: "2px solid var(--color-padel-border)",
              background: "var(--color-padel-surface)",
              color: "var(--color-padel-text)",
              padding: "10px 14px",
              fontSize: "13px",
              fontWeight: 700,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
              cursor: "pointer"
            }}
          >
            <span style={{ fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Theme
            </span>
            <span id="theme-dark-label" style={{ fontSize: "12px" }}>
              Dark
            </span>
            <span
              aria-hidden="true"
              id="theme-track"
              style={{
                width: "50px",
                height: "26px",
                borderRadius: "9999px",
                border: "1px solid var(--color-padel-border)",
                background: "var(--color-padel-surface-alt)",
                position: "relative"
              }}
            >
              <span
                id="theme-thumb"
                style={{
                  position: "absolute",
                  top: "3px",
                  left: "3px",
                  width: "18px",
                  height: "18px",
                  borderRadius: "9999px",
                  background: "var(--color-padel-primary)",
                  transition: "left 180ms ease"
                }}
              />
            </span>
            <span id="theme-light-label" style={{ fontSize: "12px", opacity: 0.7 }}>
              Light
            </span>
          </button>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  const key = "padel:web:theme";
  const root = document.documentElement;
  const btn = document.getElementById("theme-switch");
  const darkLabel = document.getElementById("theme-dark-label");
  const lightLabel = document.getElementById("theme-light-label");
  const track = document.getElementById("theme-track");
  const thumb = document.getElementById("theme-thumb");
  if (!btn || !darkLabel || !lightLabel || !track || !thumb) return;

  const getTheme = () => {
    const stored = window.localStorage.getItem(key);
    if (stored === "light" || stored === "dark") return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const applyTheme = (theme) => {
    const isLight = theme === "light";
    root.setAttribute("data-theme", theme);
    btn.setAttribute("aria-checked", String(isLight));
    btn.setAttribute("aria-label", isLight ? "Switch to dark mode" : "Switch to light mode");
    darkLabel.style.opacity = isLight ? "0.7" : "1";
    lightLabel.style.opacity = isLight ? "1" : "0.7";
    track.style.background = isLight ? "rgba(15, 118, 110, 0.28)" : "var(--color-padel-surface-alt)";
    thumb.style.left = isLight ? "27px" : "3px";
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
