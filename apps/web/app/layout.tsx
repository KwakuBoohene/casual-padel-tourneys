import type { ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@padel/shared";

import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";
import "./globals.css";

export const metadata = {
  title: "Casual Padel Tourneys",
  description: "Live Americano & Mexicano padel viewer for Casual Padel Tourneys."
};

const themeInitScript = `(function(){try{var m=localStorage.getItem("${THEME_STORAGE_KEY}");document.documentElement.dataset.theme=m==="light"?"light":"dark";}catch(e){document.documentElement.dataset.theme="dark";}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-padel-background text-padel-text antialiased font-display pt-14">
        <ThemeProvider>
          <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
            <ThemeToggle />
          </nav>

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
