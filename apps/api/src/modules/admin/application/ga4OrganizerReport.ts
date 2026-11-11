import { ga4CreationStep, organizerGa4Feature, type Ga4OrganizerReport, type Ga4Window } from "@padel/shared";
import type { Ga4ReportRequest, Ga4ReportResponse } from "./ga4DataClient.js";
import { viewerRequests } from "./ga4ViewerReport.js";

const MILESTONES = ["creation_started", "creation_step_reached", "creation_succeeded"] as const;
const count = (value?: string) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};
const exactEvent = (value: string) => ({ filter: { fieldName: "eventName", stringFilter: { matchType: "EXACT", value } } });

/** At most five fixed reports per batch; no client-supplied property, metric or dimension. */
export function organizerRequests(window: Ga4Window): Ga4ReportRequest[] {
  const viewer = viewerRequests(window);
  return [viewer[0], viewer[1], viewer[3], viewer[4], {
    dateRanges: [{ startDate: window.from, endDate: window.to }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: [...MILESTONES] } } },
    limit: 3
  }];
}

export function featureRequest(window: Ga4Window): Ga4ReportRequest {
  return {
    dateRanges: [{ startDate: window.from, endDate: window.to }],
    dimensions: [{ name: "customEvent:feature_area" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    dimensionFilter: { andGroup: { expressions: [exactEvent("page_view"), {
      filter: { fieldName: "customEvent:feature_area", inListFilter: { values: [...organizerGa4Feature.options] } }
    }] } },
    limit: organizerGa4Feature.options.length
  };
}

export function creationStepsRequest(window: Ga4Window): Ga4ReportRequest {
  return {
    dateRanges: [{ startDate: window.from, endDate: window.to }],
    dimensions: [{ name: "customEvent:creation_step" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: exactEvent("creation_step_reached"),
    limit: 25
  };
}

export function parseFeatures(report: Ga4ReportResponse): NonNullable<Ga4OrganizerReport["features"]> {
  return (report.rows ?? []).flatMap((row) => {
    const feature = organizerGa4Feature.safeParse(row.dimensionValues?.[0]?.value);
    return feature.success ? [{ feature: feature.data, views: count(row.metricValues?.[0]?.value), activeUsers: count(row.metricValues?.[1]?.value) }] : [];
  });
}

export function parseMilestones(report: Ga4ReportResponse): Ga4OrganizerReport["milestones"] {
  return MILESTONES.map((event) => ({ event, count: count(report.rows?.find((row) => row.dimensionValues?.[0]?.value === event)?.metricValues?.[0]?.value) }));
}

export function parseCreationSteps(report: Ga4ReportResponse): NonNullable<Ga4OrganizerReport["creationSteps"]> {
  return ga4CreationStep.options.map((step) => ({ step, count: count(report.rows?.find((row) => row.dimensionValues?.[0]?.value === step)?.metricValues?.[0]?.value) }));
}
