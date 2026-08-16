import { OAuth2Client } from "google-auth-library";

import type { GoogleIdentity, GoogleTokenVerifier } from "../application/ports.js";
import { normalizeEmail } from "../domain/email.js";

function configuredAudiences(): string[] {
  return Array.from(
    new Set(
      [process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_WEB_CLIENT_ID]
        .flatMap((value) => value?.split(",") ?? [])
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export class GoogleIdTokenVerifier implements GoogleTokenVerifier {
  readonly #audiences: string[];
  readonly #client: OAuth2Client | null;

  constructor() {
    this.#audiences = configuredAudiences();
    this.#client = this.#audiences.length > 0 ? new OAuth2Client() : null;
  }

  isConfigured(): boolean {
    return this.#client !== null;
  }

  async verify(idToken: string): Promise<GoogleIdentity | null> {
    if (!this.#client) {
      return null;
    }
    const ticket = await this.#client.verifyIdToken({
      idToken,
      audience: this.#audiences
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      return null;
    }
    const email = normalizeEmail(payload.email);
    return {
      googleId: payload.sub,
      email,
      name: payload.name ?? email,
      avatarUrl: payload.picture ?? undefined
    };
  }
}
