interface PlayerSearchProps {
  value: string;
  onChange: (value: string) => void;
  matchCount?: number;
  totalMatches?: number;
}

export function PlayerSearch({ value, onChange, matchCount, totalMatches }: PlayerSearchProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          placeholder="Search for a player…"
          className="
            w-full min-h-12
            px-4 pl-11
            bg-padel-surface
            border border-padel-border
            rounded-2xl
            text-sm text-padel-text
            placeholder:text-padel-muted
            focus:border-padel-primary
            transition-all
          "
        />
        <svg
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-padel-muted pointer-events-none"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        {value ? (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 min-h-12 min-w-12 inline-flex items-center justify-center rounded-xl text-padel-muted hover:text-padel-text"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {value && matchCount !== undefined && totalMatches !== undefined ? (
        <p className="text-xs text-padel-muted px-1">
          {matchCount === 0
            ? "No matches found"
            : `Showing ${matchCount} of ${totalMatches} matches`}
        </p>
      ) : null}
    </div>
  );
}
