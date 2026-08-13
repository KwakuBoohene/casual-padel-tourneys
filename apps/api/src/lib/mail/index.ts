import { ConsoleMailer } from "./consoleMailer.js";
import { MailgunMailer } from "./mailgunMailer.js";
import type { Mailer } from "./types.js";

export type MailProvider = "mailgun" | "console";

let mailerOverride: Mailer | null = null;

/** Test-only: force a specific mailer for outbound sends. */
export function setMailerOverride(mailer: Mailer | null): void {
  mailerOverride = mailer;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for the configured mail provider.`);
  }
  return value;
}

/**
 * Build a {@link Mailer} from env.
 * - `MAIL_PROVIDER=mailgun` — requires MAILGUN_API_KEY, MAILGUN_DOMAIN, MAIL_FROM
 * - `MAIL_PROVIDER=console` (default in non-production) — logs only
 */
export function createMailerFromEnv(): Mailer {
  const provider = (process.env.MAIL_PROVIDER?.trim().toLowerCase() || defaultProvider()) as string;

  if (provider === "console") {
    return new ConsoleMailer();
  }

  if (provider === "mailgun") {
    return new MailgunMailer({
      apiKey: requireEnv("MAILGUN_API_KEY"),
      domain: requireEnv("MAILGUN_DOMAIN"),
      from: requireEnv("MAIL_FROM"),
      apiBaseUrl: process.env.MAILGUN_API_BASE_URL?.trim() || undefined
    });
  }

  throw new Error(`Unsupported MAIL_PROVIDER "${provider}". Use mailgun or console.`);
}

export function getMailer(): Mailer {
  return mailerOverride ?? createMailerFromEnv();
}

function defaultProvider(): MailProvider {
  return process.env.NODE_ENV === "production" ? "mailgun" : "console";
}

export type { Mailer, MailMessage } from "./types.js";
export { ConsoleMailer } from "./consoleMailer.js";
export { MailgunMailer } from "./mailgunMailer.js";
