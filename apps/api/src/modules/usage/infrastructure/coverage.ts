import type { AdminCoverage } from "@padel/shared";
export const usageCoverage: AdminCoverage = {
  source: "observed-events",
  historyComplete: false,
  unavailable: [],
  limitations: [
    "This first-party report covers Organizer observations. Visits require device opt-in.",
    "Collection is best effort. Pauses, opt-outs and outages are not reconstructed. Active users are distinct observed signed-in actors across the whole range, including guest organizer accounts.",
    "Partial counts include only observed events within available coverage, not the full selected period. Daily totals cover full Accra calendar days and retain no identity for 13 months.",
    "Observed creation facts include later-deleted records and are separate from retained-record totals. Activity excludes arbitrary audit metadata."
  ]
};
