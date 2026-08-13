export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Provider-agnostic outbound mail port.
 * Add adapters (SES, Postmark, SMTP, …) without changing callers.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
