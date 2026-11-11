import { Ga4Reports } from "../application/ga4Reports.js";
import { GoogleGa4DataClient } from "./GoogleGa4DataClient.js";
import { ga4ReportingConfig } from "./ga4ReportingConfig.js";

/** Builds the reporting service from runtime settings; without them it reports `not_configured`. */
export function createGa4Reports(env: NodeJS.ProcessEnv = process.env): Ga4Reports {
  const config = ga4ReportingConfig(env);
  return new Ga4Reports({
    client: config ? new GoogleGa4DataClient(config) : null,
    properties: config?.properties ?? {},
    environment: config?.environment ?? "development"
  });
}
