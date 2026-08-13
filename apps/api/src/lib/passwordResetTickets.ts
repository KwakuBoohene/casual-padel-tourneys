import { randomBytes } from "node:crypto";

type ResetTicket = {
  userId: string;
  expiresAt: number;
};

const TTL_MS = 15 * 60 * 1000;
const tickets = new Map<string, ResetTicket>();

function pruneExpired(now = Date.now()): void {
  for (const [id, ticket] of tickets) {
    if (ticket.expiresAt <= now) {
      tickets.delete(id);
    }
  }
}

export function storePasswordResetTicket(userId: string): string {
  pruneExpired();
  const id = randomBytes(16).toString("base64url");
  tickets.set(id, {
    userId,
    expiresAt: Date.now() + TTL_MS
  });
  return id;
}

/** Peek without consuming — register/start may retry. */
export function peekPasswordResetTicket(resetTicket: string): { userId: string } | null {
  pruneExpired();
  const ticket = tickets.get(resetTicket);
  if (!ticket || ticket.expiresAt <= Date.now()) {
    return null;
  }
  return { userId: ticket.userId };
}

/** One-time consume on register/finish. */
export function takePasswordResetTicket(resetTicket: string): { userId: string } | null {
  pruneExpired();
  const ticket = tickets.get(resetTicket);
  if (!ticket) {
    return null;
  }
  tickets.delete(resetTicket);
  if (ticket.expiresAt <= Date.now()) {
    return null;
  }
  return { userId: ticket.userId };
}

/** Test helper */
export function clearPasswordResetTickets(): void {
  tickets.clear();
}
