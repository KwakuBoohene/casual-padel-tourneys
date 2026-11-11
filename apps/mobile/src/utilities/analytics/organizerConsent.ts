import type { createGa4Consent } from "@padel/shared";

/** Loading the shared choice must neither send events nor erase a returning visitor's identity. */
export function syncOrganizerConsent(consent: ReturnType<typeof createGa4Consent>, allowed: boolean | null) {
  if (allowed !== null && (consent.choice() === "allowed") !== allowed) consent.choose(allowed);
}
