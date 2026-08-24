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

import {
  deleteLocalValue,
  readLocalValue,
  writeLocalValue
} from "../utilities/organizer/localValueStorage";

interface StandingsColumnsContextValue {
  visible: StandingsColumnKey[];
  toggle: (key: StandingsColumnKey) => void;
  reset: () => void;
}

const StandingsColumnsContext = createContext<StandingsColumnsContextValue | null>(null);

/**
 * Which standings columns this device shows.
 *
 * App-wide rather than per screen: the picker lives in a header while the table it changes lives in
 * a sibling component, and a viewer who hides a column on the tournament board should not meet it
 * again on the career board. Mirrors `ThemeProvider` — the other per-device display preference.
 *
 * Storage failures are swallowed: a board that renders the default five is always better than a
 * board that fails mid-tournament.
 */
export function StandingsColumnsProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState<StandingsColumnKey[]>(DEFAULT_VISIBLE_COLUMNS);

  useEffect(() => {
    void (async () => {
      try {
        setVisible(parseVisibleColumns(await readLocalValue(STANDINGS_COLUMN_STORAGE_KEY)));
      } catch {
        // keep the default
      }
    })();
  }, []);

  const persist = useCallback((keys: StandingsColumnKey[]) => {
    void writeLocalValue(STANDINGS_COLUMN_STORAGE_KEY, serializeVisibleColumns(keys)).catch(
      () => undefined
    );
  }, []);

  const toggle = useCallback(
    (key: StandingsColumnKey) => {
      setVisible((current) => {
        const next = toggleColumn(current, key);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  /** Clears the stored value rather than writing today's default, so a future change to the
   *  default set still reaches anyone who never customised. */
  const reset = useCallback(() => {
    setVisible([...DEFAULT_VISIBLE_COLUMNS]);
    void deleteLocalValue(STANDINGS_COLUMN_STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo(() => ({ visible, toggle, reset }), [visible, toggle, reset]);

  return (
    <StandingsColumnsContext.Provider value={value}>{children}</StandingsColumnsContext.Provider>
  );
}

export function useStandingsColumns(): StandingsColumnsContextValue {
  const context = useContext(StandingsColumnsContext);
  if (!context) {
    throw new Error("useStandingsColumns must be used inside StandingsColumnsProvider");
  }
  return context;
}
