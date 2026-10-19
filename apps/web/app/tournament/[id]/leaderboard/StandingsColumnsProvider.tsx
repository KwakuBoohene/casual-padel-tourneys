"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  DEFAULT_VISIBLE_COLUMNS,
  parseVisibleColumns,
  serializeVisibleColumns,
  STANDINGS_COLUMN_STORAGE_KEY,
  toggleColumn,
  type StandingsColumnKey
} from "@padel/shared";

interface ContextValue {
  visible: StandingsColumnKey[];
  toggle: (key: StandingsColumnKey) => void;
  reset: () => void;
}

const StandingsColumnsContext = createContext<ContextValue | null>(null);

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function persist(keys: StandingsColumnKey[]) {
  const value = serializeVisibleColumns(keys);
  try {
    window.localStorage.setItem(STANDINGS_COLUMN_STORAGE_KEY, value);
  } catch {
    // private browsing or a full quota — the cookie below still carries the choice
  }
  // The leaderboard is server rendered, so the cookie is what makes the *first* paint correct.
  // Without it the page would show the default five and swap after hydration.
  document.cookie = `${STANDINGS_COLUMN_STORAGE_KEY}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

function clearPersisted() {
  try {
    window.localStorage.removeItem(STANDINGS_COLUMN_STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${STANDINGS_COLUMN_STORAGE_KEY}=; path=/; max-age=0; samesite=lax`;
}

/**
 * Which standings columns this browser shows.
 *
 * `initial` comes from the cookie the server already read, so the first paint is correct. After
 * hydration `localStorage` wins and the cookie is rewritten to match — that only differs if the
 * choice was changed in another tab.
 */
export function StandingsColumnsProvider(props: {
  initial: StandingsColumnKey[];
  children: ReactNode;
}) {
  const [visible, setVisible] = useState<StandingsColumnKey[]>(props.initial);

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STANDINGS_COLUMN_STORAGE_KEY);
    } catch {
      return;
    }
    if (stored === null) return;
    const parsed = parseVisibleColumns(stored);
    setVisible(parsed);
    persist(parsed);
  }, []);

  const toggle = useCallback((key: StandingsColumnKey) => {
    setVisible((current) => {
      const next = toggleColumn(current, key);
      persist(next);
      return next;
    });
  }, []);

  /** Clears the stored value rather than writing today's default, so a future change to the
   *  default set still reaches anyone who never customised. */
  const reset = useCallback(() => {
    setVisible([...DEFAULT_VISIBLE_COLUMNS]);
    clearPersisted();
  }, []);

  const value = useMemo(() => ({ visible, toggle, reset }), [visible, toggle, reset]);

  return (
    <StandingsColumnsContext.Provider value={value}>{props.children}</StandingsColumnsContext.Provider>
  );
}

/**
 * Falls back to the default when there is no provider, rather than throwing. The standings table is
 * reachable from public share links; a missing provider should degrade to a readable board, not a
 * blank error page for a spectator.
 */
export function useStandingsColumns(): ContextValue {
  return (
    useContext(StandingsColumnsContext) ?? {
      visible: DEFAULT_VISIBLE_COLUMNS,
      toggle: () => undefined,
      reset: () => undefined
    }
  );
}
