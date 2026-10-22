import type { HistoricalMetadata, HistoricalSourceRow } from "@padel/shared";
import { validation } from "../../../shared/kernel/appError.js";

/** RFC 4180 fields, including BOM, escaped quotes and embedded newlines. No spreadsheet evaluation. */
export function parseCsv(text: string): string[][] {
  if (Buffer.byteLength(text, "utf8") > 1024 * 1024) throw validation("CSV must be no larger than 1 MB.");
  if (text.includes("\0")) throw validation("CSV contains invalid characters.");
  const source = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const finishField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const finishRow = () => {
    finishField();
    if (row.some((value) => value.trim())) rows.push(row);
    row = [];
    if (rows.length > 1001) throw validation("CSV supports at most 1,000 player rows.");
  };
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
        closed = true;
      } else field += char;
    } else if (char === ",") finishField();
    else if (char === "\n" || char === "\r") {
      finishRow();
      if (char === "\r" && source[i + 1] === "\n") i += 1;
    } else if (char === '"') {
      if (field || closed) throw validation("Unexpected quote in CSV.");
      quoted = true;
    } else {
      if (closed) throw validation("Unexpected text after a quoted CSV field.");
      field += char;
    }
    if (field.length > 5000 || row.length > 40) throw validation("CSV fields are too large.");
  }
  if (quoted) throw validation("CSV has an unclosed quoted field.");
  if (field || row.length || closed) finishRow();
  if (rows.length < 2) throw validation("CSV needs a header and player rows.");
  return rows;
}

const accepted = new Set(
  "schema_version,event_key,tournament_name,event_date,source_date,tournament_mode,variant,scoring_mode,source_rank,player_name,matches_played,matches_won,matches_lost,matches_drawn,games_won,games_lost,games_difference,sets_won,sets_lost,americano_points_won,americano_points_lost,leaderboard_points,match_win_rate,game_win_rate,source_file,notes".split(
    ","
  )
);
const required = [
  "schema_version",
  "player_name",
  "matches_played",
  "matches_won",
  "matches_lost",
  "matches_drawn",
  "scoring_mode"
];

export function readHistoricalCsv(text: string): {
  metadata: HistoricalMetadata;
  rows: HistoricalSourceRow[];
} {
  const [header, ...records] = parseCsv(text);
  const keys = header.map((value) => value.trim().toLowerCase());
  if (new Set(keys).size !== keys.length) throw validation("Duplicate CSV headers.");
  for (const key of keys)
    if (!accepted.has(key)) throw validation(`Unsupported column: ${key}. Use the CSV template.`);
  for (const key of required) if (!keys.includes(key)) throw validation(`Missing column: ${key}.`);
  const names = new Set<string>(),
    ranks = new Set<number>();
  let metadata: HistoricalMetadata | undefined;
  const rows = records.map((fields, index) => {
    const rowNumber = index + 1;
    const fail = (message: string): never => {
      throw validation(`Player row ${rowNumber}: ${message}`);
    };
    if (fields.length !== keys.length) fail("column count does not match the header.");
    const record = Object.fromEntries(keys.map((key, i) => [key, fields[i].trim()]));
    if (record.schema_version !== "1") fail("unsupported schema version.");
    const meta = {
      eventKey: record.event_key ?? "",
      title: record.tournament_name ?? "",
      eventDate: record.event_date ?? "",
      mode: record.tournament_mode ?? "",
      variant: record.variant ?? "",
      scoringMode: record.scoring_mode
    } as HistoricalMetadata;
    if (metadata && JSON.stringify(meta) !== JSON.stringify(metadata))
      fail("only one event is allowed per CSV.");
    metadata = meta;
    if (!["REGULAR", "AMERICANO_POINTS"].includes(meta.scoringMode)) fail("choose a supported scoring mode.");
    const count = (key: string, optional = false): number | null => {
      const value = record[key] ?? "";
      if (!value && optional) return null;
      if (!/^\d+$/.test(value) || Number(value) > 1000000)
        fail(`${key} must be a nonnegative whole number up to 1,000,000.`);
      return Number(value);
    };
    const name = record.player_name;
    if (!name || name.length > 80) fail("player_name must contain 1–80 characters.");
    const normalized = name.toLowerCase().replace(/\s+/g, " ");
    if (names.has(normalized)) fail("duplicate player name. Resolve identities before importing.");
    names.add(normalized);
    const rank = count("source_rank", true) ?? rowNumber;
    if (rank < 1 || ranks.has(rank)) fail("source ranks must be positive and unique.");
    ranks.add(rank);
    const won = count("matches_won")!,
      lost = count("matches_lost")!,
      drawn = count("matches_drawn")!,
      played = count("matches_played")!;
    if (!played || played !== won + lost + drawn)
      fail("matches_played must equal W + L + D and be positive.");
    const gw = count("games_won", true),
      gl = count("games_lost", true);
    const sw = count("sets_won", true),
      sl = count("sets_lost", true);
    const pw = count("americano_points_won", true),
      pl = count("americano_points_lost", true);
    for (const [a, b, label] of [
      [gw, gl, "games"],
      [sw, sl, "sets"],
      [pw, pl, "rally points"]
    ] as const)
      if ((a === null) !== (b === null)) fail(`provide both ${label} totals or leave both blank.`);
    if (meta.scoringMode === "REGULAR" && gw === null) fail("Regular scoring requires games won/lost.");
    if (meta.scoringMode === "AMERICANO_POINTS" && pw === null)
      fail("Americano points scoring requires rally points won/lost.");
    if (meta.scoringMode === "REGULAR" && ((pw ?? 0) !== 0 || (pl ?? 0) !== 0))
      fail("Regular results cannot contain rally points.");
    if (
      meta.scoringMode === "AMERICANO_POINTS" &&
      ((gw ?? 0) !== 0 || (gl ?? 0) !== 0 || (sw ?? 0) !== 0 || (sl ?? 0) !== 0)
    )
      fail("Rally-point results cannot contain Regular games or sets.");
    if (
      record.games_difference &&
      (gw === null ||
        gl === null ||
        !/^-?\d+$/.test(record.games_difference) ||
        Number(record.games_difference) !== gw - gl)
    )
      fail("games_difference does not match GW - GL.");
    const rate = (key: string, numerator: number, denominator: number) => {
      const value = record[key];
      if (!value) return;
      const parsed = value.endsWith("%") ? Number(value.slice(0, -1)) / 100 : Number(value);
      if (!denominator || !Number.isFinite(parsed) || Math.abs(parsed - numerator / denominator) > 0.00051)
        fail(`${key} does not match the counts.`);
    };
    rate("match_win_rate", won, played);
    if (gw !== null && gl !== null) rate("game_win_rate", gw, gw + gl);
    const sourcePoints = count("leaderboard_points", true);
    if (sourcePoints !== null && sourcePoints !== won)
      fail("leaderboard_points must use match-win points, not rally points.");
    return {
      rowNumber,
      rank,
      name,
      matchesPlayed: played,
      matchesWon: won,
      matchesLost: lost,
      matchesDrawn: drawn,
      gamesWon: gw,
      gamesLost: gl,
      setsWon: sw,
      setsLost: sl,
      americanoPointsWon: pw,
      americanoPointsLost: pl,
      sourcePoints,
      sourceFile: (record.source_file ?? "").slice(0, 500),
      notes: (record.notes ?? "").slice(0, 2000)
    };
  });
  for (const [a, b] of [
    ["matchesWon", "matchesLost"],
    ["gamesWon", "gamesLost"],
    ["setsWon", "setsLost"],
    ["americanoPointsWon", "americanoPointsLost"]
  ] as const) {
    if (
      rows.every((row) => row[a] !== null && row[b] !== null) &&
      rows.reduce((sum, row) => sum + (row[a] ?? 0) - (row[b] ?? 0), 0) !== 0
    )
      throw validation(`${a} and ${b} do not balance for a complete event.`);
  }
  if (rows.reduce((sum, row) => sum + row.matchesPlayed, 0) % 4 !== 0)
    throw validation("A complete doubles event needs a multiple of four player appearances.");
  return { metadata: metadata!, rows };
}
