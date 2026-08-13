import { logger } from "../logger.js";
import type { MailMessage, Mailer } from "./types.js";

/** Dev/test adapter — never sends network mail; does not log message bodies with tokens if caller redacts. */
export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    logger.info("mail/console: message queued", {
      to: message.to,
      subject: message.subject,
      hasHtml: Boolean(message.html)
    });
  }
}
