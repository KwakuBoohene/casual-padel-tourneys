import {
  attachPasswordRegisterFinish,
  attachPasswordRegisterStart,
  passwordResetRegisterFinish,
  passwordResetRegisterStart,
  type AuthSession
} from "./auth";
import {
  opaqueFinishRegistration,
  opaqueStartRegistration
} from "./passwordOpaque";

export async function attachPasswordToGuest(email: string, password: string): Promise<AuthSession> {
  const { clientRegistrationState, registrationRequest } = await opaqueStartRegistration(password);
  const { registrationResponse } = await attachPasswordRegisterStart({ email, registrationRequest });
  const { registrationRecord } = await opaqueFinishRegistration({
    clientRegistrationState,
    registrationResponse,
    password
  });
  return attachPasswordRegisterFinish({ email, registrationRecord });
}

export async function finishPasswordReset(
  resetTicket: string,
  password: string
): Promise<AuthSession> {
  const { clientRegistrationState, registrationRequest } = await opaqueStartRegistration(password);
  const { registrationResponse } = await passwordResetRegisterStart({
    resetTicket,
    registrationRequest
  });
  const { registrationRecord } = await opaqueFinishRegistration({
    clientRegistrationState,
    registrationResponse,
    password
  });
  return passwordResetRegisterFinish({ resetTicket, registrationRecord });
}
