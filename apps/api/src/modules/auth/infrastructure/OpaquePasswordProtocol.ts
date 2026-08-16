import {
  ensurePasswordProtocolReady,
  getPasswordServerSetup,
  passwordProtocol
} from "../../../lib/passwordProtocol.js";
import type { PasswordProtocolPort } from "../application/passwordPorts.js";

/** Thin wrapper over `lib/passwordProtocol.ts` — the OPAQUE exchange itself is unchanged. */
export class OpaquePasswordProtocol implements PasswordProtocolPort {
  async ensureReady(): Promise<void> {
    await ensurePasswordProtocolReady();
    getPasswordServerSetup();
  }

  createRegistrationResponse(input: {
    userIdentifier: string;
    registrationRequest: string;
  }): string {
    const { registrationResponse } = passwordProtocol.createRegistrationResponse({
      serverSetup: getPasswordServerSetup(),
      userIdentifier: input.userIdentifier,
      registrationRequest: input.registrationRequest
    });
    return registrationResponse;
  }

  startLogin(input: {
    userIdentifier: string;
    registrationRecord: string | null;
    startLoginRequest: string;
  }): { loginResponse: string; serverLoginState: string } {
    const { loginResponse, serverLoginState } = passwordProtocol.startLogin({
      serverSetup: getPasswordServerSetup(),
      userIdentifier: input.userIdentifier,
      registrationRecord: input.registrationRecord,
      startLoginRequest: input.startLoginRequest
    });
    return { loginResponse, serverLoginState };
  }

  finishLogin(input: { serverLoginState: string; finishLoginRequest: string }): void {
    passwordProtocol.finishLogin({
      serverLoginState: input.serverLoginState,
      finishLoginRequest: input.finishLoginRequest
    });
  }
}
