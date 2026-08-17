import {
  STANDINGS_HELP_ABBREVIATIONS,
  STANDINGS_HELP_BLURB,
  STANDINGS_RANKING_STEPS
} from "@padel/shared";

export function WebStandingsHelp() {
  return (
    <details className="relative shrink-0">
      <summary
        aria-label="How ranking works"
        className="min-h-12 min-w-12 list-none cursor-pointer rounded-full border border-padel-border bg-padel-surface text-center text-lg font-bold text-padel-text inline-flex items-center justify-center [&::-webkit-details-marker]:hidden"
      >
        ?
      </summary>
      <div className="absolute left-auto right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2.5rem))] space-y-3 rounded-2xl border border-padel-border bg-padel-surface px-4 py-4 shadow-lg">
        <p className="text-sm font-bold text-padel-text">How ranking works</p>
        <p className="text-sm text-padel-muted leading-5">{STANDINGS_HELP_BLURB}</p>
        <p className="text-sm font-bold text-padel-text">Abbreviations</p>
        <dl className="space-y-2">
          {STANDINGS_HELP_ABBREVIATIONS.map((row) => (
            <div key={row.abbrev} className="flex gap-3 text-sm">
              <dt className="w-12 shrink-0 font-bold text-padel-text">{row.abbrev}</dt>
              <dd className="text-padel-text leading-5">{row.meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm font-bold text-padel-text">Ranking order</p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm text-padel-text leading-5">
          {STANDINGS_RANKING_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}
