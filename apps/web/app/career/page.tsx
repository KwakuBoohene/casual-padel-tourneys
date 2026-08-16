"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  formatOrganizerPlayerLeaderboardMode,
  type OrganizerPlayerLeaderboardMode,
  type OrganizerPlayerLeaderboardRow,
  type OrganizerPlayerRange
} from "@padel/shared";

import {
  fetchCareerLeaderboard,
  ORGANIZER_TOKEN_STORAGE_KEY
} from "./careerApi";

const RANGES: { id: OrganizerPlayerRange; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All time" }
];

const MODES: OrganizerPlayerLeaderboardMode[] = [
  "overall",
  "AMERICANO",
  "MEXICANO",
  "KING_OF_THE_HILL"
];

const SEARCH_DEBOUNCE_MS = 250;

function emptyMessage(mode: OrganizerPlayerLeaderboardMode, hasSearch: boolean): string {
  if (hasSearch) return "No players match your search in this range.";
  if (mode === "overall") return "No career matches yet in this range.";
  return `No ${formatOrganizerPlayerLeaderboardMode(mode).toLowerCase()} results in this range.`;
}

export default function CareerPage() {
  const [tokenInput, setTokenInput] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [range, setRange] = useState<OrganizerPlayerRange>("year");
  const [mode, setMode] = useState<OrganizerPlayerLeaderboardMode>("overall");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rows, setRows] = useState<OrganizerPlayerLeaderboardRow[]>([]);
  const [guestMessage, setGuestMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(ORGANIZER_TOKEN_STORAGE_KEY);
    if (stored) {
      setToken(stored);
      setTokenInput(stored);
    }
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchQuery.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  const saveToken = () => {
    const trimmed = tokenInput.trim();
    if (!trimmed) return;
    window.localStorage.setItem(ORGANIZER_TOKEN_STORAGE_KEY, trimmed);
    setToken(trimmed);
  };

  const reload = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setErrorText("");
    try {
      const data = await fetchCareerLeaderboard({
        token,
        range,
        mode,
        q: debouncedSearch || undefined
      });
      if (data.guest) {
        setGuestMessage(data.message ?? "Attach an account to track player careers.");
        setRows([]);
      } else {
        setGuestMessage(null);
        setRows(data.rows);
      }
    } catch (error) {
      setErrorText((error as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token, range, mode, debouncedSearch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <main className="min-h-screen bg-padel-background text-padel-text px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-padel-primary font-bold">Organizer</p>
          <h1 className="text-4xl font-black tracking-tight">Career leaderboard</h1>
          <p className="text-padel-muted">
            Rankings across opted-in Americano, Mexicano, and King of the Court events — sorted by
            match wins.
          </p>
        </div>

        {!token ? (
          <section className="rounded-2xl border border-padel-border bg-padel-surface p-6 space-y-4">
            <h2 className="text-xl font-bold">Sign in to view your board</h2>
            <p className="text-padel-muted text-sm leading-relaxed">
              Preferred auth is your organizer JWT from the mobile app (same token the organizer API
              expects in an <code className="text-padel-text">Authorization: Bearer</code> header).
              Paste it below for local testing — it is stored in this browser&apos;s localStorage only.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Organizer JWT…"
                aria-label="Organizer JWT"
                className="flex-1 px-4 py-3 rounded-xl bg-padel-background border border-padel-border text-padel-text placeholder:text-padel-muted focus:outline-none focus:border-padel-primary"
              />
              <button
                type="button"
                onClick={saveToken}
                className="join-cta px-6 py-3 rounded-xl font-bold"
              >
                Use token
              </button>
            </div>
            <p className="text-sm text-padel-muted">
              Or sign in via the{" "}
              <Link href="/" className="text-padel-primary font-semibold hover:underline">
                mobile organizer app
              </Link>{" "}
              and copy your session token from dev tools.
            </p>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {RANGES.map((entry) => {
                const active = range === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setRange(entry.id)}
                    className={`px-4 py-2 rounded-full font-bold border transition-colors ${
                      active
                        ? "border-padel-primary text-padel-primary"
                        : "border-padel-border text-padel-text"
                    }`}
                  >
                    {entry.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {MODES.map((entry) => {
                const active = mode === entry;
                return (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => setMode(entry)}
                    className={`px-4 py-2 rounded-full font-bold border transition-colors ${
                      active
                        ? "border-padel-primary text-padel-primary"
                        : "border-padel-border text-padel-text"
                    }`}
                  >
                    {formatOrganizerPlayerLeaderboardMode(entry)}
                  </button>
                );
              })}
            </div>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search players…"
              aria-label="Search career players"
              className="w-full px-4 py-3 rounded-xl bg-padel-surface border border-padel-border text-padel-text placeholder:text-padel-muted focus:outline-none focus:border-padel-primary"
            />
            {guestMessage ? (
              <p className="rounded-xl border border-padel-border bg-padel-surface p-4 text-padel-muted">
                {guestMessage}
              </p>
            ) : null}
            {loading ? <p className="text-padel-muted">Loading…</p> : null}
            {errorText ? <p className="text-padel-danger">{errorText}</p> : null}
            {!loading && !guestMessage && rows.length === 0 ? (
              <p className="text-padel-muted">{emptyMessage(mode, debouncedSearch.length > 0)}</p>
            ) : null}
            <ul className="space-y-3">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-4 rounded-xl border border-padel-border bg-padel-surface px-4 py-4"
                >
                  <span className="w-8 text-padel-muted font-bold">{row.rank}</span>
                  <div className="flex-1">
                    <p className="font-bold text-lg">{row.name}</p>
                    <p className="text-sm text-padel-muted">
                      {row.matchesWon} match wins · {row.gamesWon} games won · {row.eventsPlayed}{" "}
                      events
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
