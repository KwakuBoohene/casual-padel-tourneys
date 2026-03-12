import type { ReactNode } from "react";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-padel-navy text-slate-100 antialiased">{children}</body>
    </html>
  );
}
