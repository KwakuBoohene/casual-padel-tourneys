import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Casual Padel Tourneys",
  description: "Live Americano & Mexicano padel viewer for Casual Padel Tourneys."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-padel-background text-padel-text antialiased font-display">{children}</body>
    </html>
  );
}
