export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Never print credential-bearing invitation content in a console adapter. */
  sensitive?: boolean;
}

/**
 * Provider-agnostic outbound mail port.
 * Add adapters (SES, Postmark, SMTP, …) without changing callers.
 */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}
