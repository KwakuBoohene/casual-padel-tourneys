import { z } from "zod";
import { USAGE_SESSION_MS } from "../schemas/usage.js";
import type { Ga4Envelope } from "../schemas/ga4.js";

const consentId = z.string().uuid({ version: "v4" });
const sessionSchema = z.object({ id: z.number().int().positive(), lastAt: z.number().int().positive() });

type Storage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): void;
};

export function createGa4Consent(key: string, ports: {
  consent: Storage;
  session: Storage;
  uuid(): string;
  now(): number;
  device(): Ga4Envelope["device"];
}) {
  const sessionKey = (id: string) => `${key}:session:${id}`;
  let withdrawn = false;
  const readStored = (): string | null => {
    try {
      return ports.consent.get(key);
    } catch {
      return null;
    }
  };
  const read = () => withdrawn ? "no" : readStored();
  return {
    choice(): "unset" | "allowed" | "denied" {
      const value = read();
      return consentId.safeParse(value).success ? "allowed" : value === "no" ? "denied" : "unset";
    },
    choose(allow: boolean): void {
      const previous = readStored();
      if (!allow) withdrawn = true;
      try {
        ports.consent.set(key, allow ? ports.uuid() : "no");
        withdrawn = false;
        if (previous && consentId.safeParse(previous).success) ports.session.delete(sessionKey(previous));
      } catch {
        // A browser that refuses to store the choice cannot opt in.
      }
    },
    envelope(): Ga4Envelope | null {
      const client = consentId.safeParse(read());
      if (!client.success) return null;
      const now = ports.now();
      const key = sessionKey(client.data);
      let previous: z.infer<typeof sessionSchema> | undefined;
      try {
        previous = sessionSchema.safeParse(JSON.parse(ports.session.get(key) ?? "null")).data;
      } catch {
        // A new session can start if the previous one is unavailable.
      }
      const id = previous && now >= previous.lastAt && now - previous.lastAt < USAGE_SESSION_MS
        ? previous.id : Math.floor(now / 1000);
      try {
        ports.session.set(key, JSON.stringify({ id, lastAt: now }));
      } catch {
        return null;
      }
      return { consent: true, clientId: client.data, sessionId: id, device: ports.device() };
    }
  };
}
