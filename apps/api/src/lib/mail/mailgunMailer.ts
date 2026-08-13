import { logger } from "../logger.js";
import type { MailMessage, Mailer } from "./types.js";

export type MailgunMailerOptions = {
  apiKey: string;
  domain: string;
  from: string;
  /** Defaults to https://api.mailgun.net */
  apiBaseUrl?: string;
};

/**
 * Mailgun HTTP Messages API adapter.
 * Swap by implementing {@link Mailer} and selecting via MAIL_PROVIDER.
 */
export class MailgunMailer implements Mailer {
  private readonly apiKey: string;
  private readonly domain: string;
  private readonly from: string;
  private readonly apiBaseUrl: string;

  constructor(options: MailgunMailerOptions) {
    this.apiKey = options.apiKey;
    this.domain = options.domain;
    this.from = options.from;
    this.apiBaseUrl = (options.apiBaseUrl ?? "https://api.mailgun.net").replace(/\/$/, "");
  }

  async send(message: MailMessage): Promise<void> {
    const url = `${this.apiBaseUrl}/v3/${this.domain}/messages`;
    const body = new URLSearchParams();
    body.set("from", this.from);
    body.set("to", message.to);
    body.set("subject", message.subject);
    body.set("text", message.text);
    if (message.html) {
      body.set("html", message.html);
    }

    const auth = Buffer.from(`api:${this.apiKey}`).toString("base64");
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
    } catch (error) {
      logger.error("mail/mailgun: network error", { domain: this.domain });
      throw new Error("Could not send email.");
    }

    if (!response.ok) {
      logger.error("mail/mailgun: provider rejected message", {
        domain: this.domain,
        status: response.status
      });
      throw new Error("Could not send email.");
    }

    logger.info("mail/mailgun: message accepted", {
      to: message.to,
      subject: message.subject,
      status: response.status
    });
  }
}
