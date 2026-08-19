import type { OrganizerPlayerRange } from "@padel/shared";

export type CareerRangeOption = OrganizerPlayerRange;

export const CAREER_RANGES: { id: CareerRangeOption; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" }
];

/** An unrecognised value in the URL falls back rather than erroring the page. */
export function parseCareerRange(value: string | undefined): CareerRangeOption {
  return CAREER_RANGES.some((range) => range.id === value)
    ? (value as CareerRangeOption)
    : "year";
}
