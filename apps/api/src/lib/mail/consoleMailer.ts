import { logger } from "../logger.js";
import type { MailMessage, Mailer } from "./types.js";

/**
 * Dev/test adapter — never sends network mail.
 * Logs the full text body so magic / verify / reset links are copyable locally.
 */
export class ConsoleMailer implements Mailer {
  async send(message: MailMessage): Promise<void> {
    logger.info("mail/console: message queued (not sent)", {
      to: message.to,
      subject: message.subject,
      text: message.text
    });
  }
}
