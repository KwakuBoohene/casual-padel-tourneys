import { SentryHealth } from "../application/sentryHealth.js";
import { sentryHealthConfig } from "./sentryHealthConfig.js";
import { HttpSentryIssuesClient } from "./SentryIssuesClient.js";

export function createSentryHealth() {
  const config = sentryHealthConfig();
  return new SentryHealth(config, config ? new HttpSentryIssuesClient(config) : null);
}
