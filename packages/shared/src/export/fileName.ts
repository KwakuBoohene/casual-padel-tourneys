export type ExportKind = "leaderboard" | "matches";
export type ExportFormat = "pdf" | "csv";

const MAX_SLUG_LENGTH = 60;

export function slugifyForFileName(value: string): string {
  const slug = value
    .normalize("NFKD")
    // Strip accents so the filename stays portable across filesystems.
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, "") || "export";
}

/**
 * `{name}-{kind}-{yyyy-mm-dd}.{format}` — the date keeps repeat exports from
 * silently overwriting each other in a downloads folder.
 */
export function exportFileName(
  kind: ExportKind,
  name: string,
  isoDate: string,
  format: ExportFormat
): string {
  const day = isoDate.indexOf("T") === -1 ? isoDate : isoDate.slice(0, isoDate.indexOf("T"));
  return `${slugifyForFileName(name)}-${kind}-${day}.${format}`;
}

export function exportContentType(format: ExportFormat): string {
  return format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8";
}
