import {
  passwordLoginFinish,
  passwordLoginStart,
  passwordRegisterFinish,
  passwordRegisterStart,
  type AuthSession
} from "./auth";
import {
  opaqueFinishLogin,
  opaqueFinishRegistration,
  opaqueStartLogin,
  opaqueStartRegistration
} from "./passwordOpaque";

export async function registerPasswordAccount(email: string, password: string): Promise<void> {
  const { clientRegistrationState, registrationRequest } = await opaqueStartRegistration(password);
  const { registrationResponse } = await passwordRegisterStart({ email, registrationRequest });
  const { registrationRecord } = await opaqueFinishRegistration({
    clientRegistrationState,
    registrationResponse,
    password
  });
  await passwordRegisterFinish({ email, registrationRecord });
}

export async function loginWithPassword(email: string, password: string): Promise<AuthSession> {
  const { clientLoginState, startLoginRequest } = await opaqueStartLogin(password);
  const { loginResponse, loginId } = await passwordLoginStart({ email, startLoginRequest });
  const finished = await opaqueFinishLogin({
    clientLoginState,
    loginResponse,
    password
  });
  if (!finished?.finishLoginRequest) {
    throw new Error("Invalid email or password.");
  }
  return passwordLoginFinish({
    email,
    loginId,
    finishLoginRequest: finished.finishLoginRequest
  });
}
