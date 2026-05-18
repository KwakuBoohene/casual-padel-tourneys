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
    <html lang="en" suppressHydrationWarning data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-padel-background text-padel-text antialiased font-display">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
