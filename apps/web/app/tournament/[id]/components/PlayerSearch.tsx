interface PlayerSearchProps {
  value: string;
  onChange: (value: string) => void;
  matchCount?: number;
  totalMatches?: number;
}

export function PlayerSearch({ value, onChange, matchCount, totalMatches }: PlayerSearchProps) {
  const handleClear = () => {
    onChange("");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.currentTarget.value);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Search for a player..."
          className="
            w-full
            px-3 py-2.5 pl-10 sm:px-4 sm:py-3 sm:pl-11
            bg-padel-surface
            border border-padel-border
            surface-panel
            rounded-xl
            text-xs sm:text-sm text-padel-text
            placeholder:text-padel-muted
            focus:outline-none focus:ring-2 focus:ring-padel-primary/50 focus:border-padel-primary
            transition-all
          "
        />
        <svg
          className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-padel-muted"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              h-6 w-6
              flex items-center justify-center
              rounded-full
              bg-padel-surfaceAlt
              hover:bg-padel-surfaceAlt/80
              transition-colors
            "
            aria-label="Clear search"
          >
            <svg
              className="h-3.5 w-3.5 text-padel-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {value && matchCount !== undefined && totalMatches !== undefined && (
        <div className="flex items-center justify-between text-xs px-1 animate-fade-in">
          <span className="text-padel-muted">
            {matchCount === 0 ? (
              "No matches found"
            ) : (
              <>
                Showing{" "}
                <span className="font-bold text-padel-primary bg-padel-primary/10 px-1.5 py-0.5 rounded">
                  {matchCount}
                </span>{" "}
                of <span className="font-semibold text-padel-text">{totalMatches}</span> matches
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
}
