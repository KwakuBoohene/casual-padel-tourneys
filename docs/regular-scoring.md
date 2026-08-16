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

## Validation

- `setsToWin` is an integer from `1` to `REGULAR_SETS_TO_WIN_MAX` (`4`).
- `matchTiebreak: true` is only valid with `setsToWin: 2`.
- Full set + win-by-2 still requires `setTiebreakTo` (`7` or `10`).

## Engine behaviour

- **Best of N** (`matchTiebreak` off): first side to `setsToWin` wins; if sets are
  even and fewer than `2 * setsToWin - 1` sets have been played, the match stays
  incomplete (another set).
- **2 sets + match TB**: after `1–1`, a match tiebreak (first to 7, win by 2)
  decides the match.
