import { AppError, notFound } from "../../../shared/kernel/appError.js";
import type { PadelMixSource } from "../application/ports.js";

const PADELMIX_API = "https://api.padelmix.app/v1/tournaments";
const TIMEOUT_MS = 8000;
const MAX_BODY_CHARS = 2_000_000;

function unavailable(): AppError {
  return new AppError("INTERNAL", 502, "Could not reach PadelMix. Try again in a moment.");
}

/**
 * Fetches from the fixed PadelMix host only. The code is validated by the
 * caller and encoded here, and redirects are refused, so a pasted link can
 * never steer this request anywhere else.
 */
export class HttpPadelMixSource implements PadelMixSource {
  async fetchTournament(code: string): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${PADELMIX_API}/${encodeURIComponent(code)}`, {
        headers: { accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
    } catch {
      throw unavailable();
    }
    if (response.status === 404) {
      throw notFound("PadelMix tournament not found. Check the link and try again.");
    }
    if (!response.ok) {
      throw unavailable();
    }
    try {
      const body = await response.text();
      if (body.length > MAX_BODY_CHARS) {
        throw unavailable();
      }
      return JSON.parse(body) as unknown;
    } catch {
      throw unavailable();
    }
  }
}
