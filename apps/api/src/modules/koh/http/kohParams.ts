const invalid = "courtNumber must be a positive integer.";

export type ParsedCourtNumber<T> = { ok: true; courtNumber: T } | { ok: false; message: string };

export function parseCourtNumber(raw: string): ParsedCourtNumber<number> {
  const courtNumber = Number(raw);
  if (!Number.isInteger(courtNumber) || courtNumber < 1) {
    return { ok: false, message: invalid };
  }
  return { ok: true, courtNumber };
}

/** Query-string variant: absent / empty means "all courts". */
export function parseOptionalCourtNumber(
  raw: string | undefined
): ParsedCourtNumber<number | undefined> {
  if (raw === undefined || raw === "") {
    return { ok: true, courtNumber: undefined };
  }
  return parseCourtNumber(raw);
}
