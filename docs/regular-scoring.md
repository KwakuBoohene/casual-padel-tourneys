# Regular scoring (match length)

Organizer-facing match lengths map onto `regularScoring.setsToWin` and
`regularScoring.matchTiebreak`. Per-set rules (`setFormat`, `gameWinBy`,
`setTiebreakTo`) are independent — e.g. `BO3_GAMES` is games-to-win **within a
set**, not “best of 3 sets”.

Never use the word “tennis” in product copy or user-facing errors.

## UI ↔ config (locked)

| UI choice | `setsToWin` | `matchTiebreak` |
|-----------|-------------|-----------------|
| 1 set | `1` | `false` |
| 2 sets + match TB | `2` | `true` |
| Best of 3 | `2` | `false` |
| Best of 5 | `3` | `false` |
| Best of 7 | `4` | `false` |

Shared helpers: `REGULAR_MATCH_LENGTH_PRESETS`, `regularMatchLengthFromPreset` in
`@padel/shared`.

## Set margin (`gameWinBy`)

`gameWinBy` is how many **clear games** a side needs to take a set. It defaults from
`setFormat` and has nothing to do with deuce, which is points inside a single game:

| `setFormat` | Default `gameWinBy` | Finished sets look like |
|-------------|---------------------|-------------------------|
| `BO3_GAMES` | `1` | `2–0`, `2–1` |
| `BO5_GAMES` | `1` | `3–0`, `3–1`, `3–2` |
| `FULL_SET`  | `2` | `6–0` … `6–4`, `7–5`, or `6–6` + set tiebreak |

A full set never records `7–6` in games: at `6–6` the set carries `tbA` / `tbB` instead, and a
score of `7` is only valid against `5`.

Clients may send `gameWinBy` explicitly to override the default (e.g. a best-of-5-games set that
must be won by two). Deuce mode (`ADVANTAGE` / `GOLDEN` / `STAR`) is recorded separately and never
changes the margin — see `defaultGameWinByForSetFormat` in `@padel/shared`.

## Validation

- `setsToWin` is an integer from `1` to `REGULAR_SETS_TO_WIN_MAX` (`4`).
- `matchTiebreak: true` is only valid with `setsToWin: 2`.
- Full set + win-by-2 needs `setTiebreakTo` (`7` or `10`); it defaults to `7` when omitted.

## Engine behaviour

- **Best of N** (`matchTiebreak` off): first side to `setsToWin` wins; if sets are
  even and fewer than `2 * setsToWin - 1` sets have been played, the match stays
  incomplete (another set).
- **2 sets + match TB**: after `1–1`, a match tiebreak (first to 7, win by 2)
  decides the match.
