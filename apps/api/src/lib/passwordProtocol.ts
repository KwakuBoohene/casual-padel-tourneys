import * as opaque from "@serenity-kit/opaque";

import { logger } from "./logger.js";

let readyPromise: Promise<void> | null = null;

export async function ensurePasswordProtocolReady(): Promise<void> {
  if (!readyPromise) {
    readyPromise = opaque.ready;
  }
  await readyPromise;
}

export function getPasswordServerSetup(): string {
  const setup = process.env.OPAQUE_SERVER_SETUP?.trim();
  if (!setup) {
    logger.error("password auth: server setup env missing");
    throw new Error("Password authentication is not configured.");
  }
  return setup;
}

export const passwordProtocol = {
  createRegistrationResponse: opaque.server.createRegistrationResponse,
  startLogin: opaque.server.startLogin,
  finishLogin: opaque.server.finishLogin,
  /** Test / tooling helpers — client side of the protocol. */
  client: opaque.client,
  createSetup: opaque.server.createSetup
};
