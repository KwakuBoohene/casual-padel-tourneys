export function usageEnabled(source: "visits" | "business"): boolean {
  return (process.env[source === "visits" ? "USAGE_VISITS_ENABLED" : "USAGE_BUSINESS_ENABLED"] ?? "true") === "true";
}
