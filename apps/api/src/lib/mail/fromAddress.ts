const STRAY_QUOTES = /^[\s\\"']+|[\s\\"']+$/g;

function stripStrayQuotes(value: string): string {
  return value.replace(STRAY_QUOTES, "");
}

/**
 * Normalise MAIL_FROM into a clean RFC 5322 mailbox.
 *
 * Docker Compose `env_file` (and some secret stores) keep literal or escaped
 * quotes, so `MAIL_FROM="Casual Padel <noreply@x>"` can arrive with the quotes
 * attached and inbox clients render the sender as `"Casual Padel`. Strip stray
 * quotes from the value and the display name, then re-quote the name only
 * when it contains characters that require it.
 */
export function normalizeFromAddress(raw: string): string {
  const value = stripStrayQuotes(raw);
  const mailbox = /^(.*?)\s*<([^<>\s]+)>$/.exec(value);
  if (!mailbox) return value;

  const name = stripStrayQuotes(mailbox[1]);
  const address = mailbox[2];
  if (!name) return address;

  const needsQuotes = /[()<>[\]:;@\\,."]/.test(name);
  const displayName = needsQuotes ? `"${name.replace(/(["\\])/g, "\\$1")}"` : name;
  return `${displayName} <${address}>`;
}
