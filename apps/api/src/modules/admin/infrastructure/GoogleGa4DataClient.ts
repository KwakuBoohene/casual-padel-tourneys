import { GoogleAuth } from "google-auth-library";
import {
  Ga4ProviderError,
  type Ga4DataClient,
  type Ga4RealtimeRequest,
  type Ga4ReportRequest,
  type Ga4ReportResponse
} from "../application/ga4DataClient.js";
import type { Ga4ReportingConfig } from "./ga4ReportingConfig.js";

const BASE = "https://analyticsdata.googleapis.com/v1beta/properties";
const TIMEOUT_MS = 8_000;

/** GA4 Data API over REST using a read-only service account. Keys never leave the API. */
export class GoogleGa4DataClient implements Ga4DataClient {
  private readonly auth: GoogleAuth;

  constructor(config: Pick<Ga4ReportingConfig, "credentials">) {
    this.auth = new GoogleAuth({
      credentials: config.credentials,
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"]
    });
  }

  async batchRunReports(propertyId: string, requests: Ga4ReportRequest[]) {
    const body = await this.post<{ reports?: Ga4ReportResponse[] }>(propertyId, "batchRunReports", {
      requests
    });
    return body.reports ?? [];
  }

  runReport(propertyId: string, request: Ga4ReportRequest) {
    return this.post<Ga4ReportResponse>(propertyId, "runReport", request);
  }

  runRealtimeReport(propertyId: string, request: Ga4RealtimeRequest) {
    return this.post<Ga4ReportResponse>(propertyId, "runRealtimeReport", request);
  }

  private async post<T>(propertyId: string, method: string, payload: unknown): Promise<T> {
    let response: Response;
    try {
      const token = await this.auth.getAccessToken();
      response = await fetch(`${BASE}/${propertyId}:${method}`, {
        method: "POST",
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
    } catch {
      // Never include the underlying error: it can carry credential or token detail.
      throw new Ga4ProviderError("failed", "GA4 request could not be completed.");
    }
    if (response.ok) return (await response.json()) as T;
    if (response.status === 429) throw new Ga4ProviderError("quota", "GA4 quota exceeded.");
    if (response.status === 400) throw new Ga4ProviderError("invalid", "GA4 rejected the report.");
    throw new Ga4ProviderError("failed", `GA4 responded with status ${response.status}.`);
  }
}
