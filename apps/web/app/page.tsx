"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const [token, setToken] = useState("");
  const router = useRouter();

  const handleJoin = () => {
    if (token.trim()) {
      router.push(`/tournament/${token.trim()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleJoin();
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
  };
  return (
    <main className="min-h-screen bg-padel-background text-padel-text overflow-hidden relative">
      {/* Hero Section */}
      <section className="home-hero-surface relative min-h-screen flex items-center justify-center px-6 py-20">
        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Content */}
          <div className="space-y-8 text-left">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.3em] text-padel-primary font-bold">
                Casual Padel Tourneys
              </p>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tight leading-none">
                Live Tournament
                <span className="block text-padel-primary mt-2">Viewer</span>
              </h1>
              <p className="text-lg md:text-xl text-padel-muted max-w-xl">
                Watch matches unfold in real-time. Track scores, standings, and follow your favorite players.
              </p>
            </div>

            {/* Token Input Section */}
            <div className="space-y-4 pt-4">
              <h2 className="text-2xl md:text-3xl font-black">Ready to watch?</h2>
              <p className="text-base text-padel-muted max-w-xl">
                Paste a share token from the organizer app to instantly join a private tournament view.
                Experience real-time score updates and detailed statistics.
              </p>
              <div className="flex gap-3 max-w-lg">
                <input
                  type="text"
                  value={token}
                  onChange={handleTokenChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter share token..."
                  className="flex-1 px-4 py-3 rounded-xl bg-padel-surface border border-padel-border text-padel-text placeholder:text-padel-muted focus:outline-none focus:border-padel-primary transition-colors"
                />
                <button
                  onClick={handleJoin}
                  className="px-8 py-3 rounded-xl bg-padel-primary text-white font-bold hover:scale-105 transition-transform"
                >
                  Join
                </button>
              </div>
              <p className="text-sm text-padel-muted">
                Or try our{" "}
                <Link href="/tournament/demo" className="text-padel-primary font-semibold hover:underline">
                  demo tournament
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
    </main>
  );
}
