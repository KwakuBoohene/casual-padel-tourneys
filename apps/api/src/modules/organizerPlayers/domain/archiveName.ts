import { normalizeOrganizerPlayerName } from "./careerRange.js";

export const ARCHIVED_NAME_MAX = 80;

export function archivedNameKey(id: string): string {
  return `archived:${id}`;
}

export function applyNameSuffix(base: string, suffix: string, max = ARCHIVED_NAME_MAX): string {
  const trimmed = base.trim();
  if (trimmed.length + suffix.length <= max) return `${trimmed}${suffix}`;
  const kept = trimmed.slice(0, Math.max(1, max - suffix.length)).trimEnd();
  return `${kept}${suffix}`;
}

export function nextUnarchiveDisplayName(originalName: string, takenNormalized: Set<string>): string {
  const first = applyNameSuffix(originalName, " (unarchived)");
  if (!takenNormalized.has(normalizeOrganizerPlayerName(first))) return first;
  let index = 1;
  for (;;) {
    const candidate = applyNameSuffix(originalName, ` unarchived-${index}`);
    if (!takenNormalized.has(normalizeOrganizerPlayerName(candidate))) return candidate;
    index += 1;
  }
}
