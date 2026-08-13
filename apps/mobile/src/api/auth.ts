import { apiPost } from "./client";

export type AuthUser = {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
  emailVerified?: boolean;
  verifyBy?: number;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
};

export async function signInWithGoogle(idToken: string): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/google", { idToken });
}

export async function signInAsGuest(guestId: string): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/guest", { guestId });
}

export async function requestMagicLink(email: string): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/auth/magic-link", { email });
}

export async function consumeMagicLink(token: string): Promise<AuthSession> {
  return apiPost<AuthSession>("/auth/magic-link/consume", { token });
}

export async function resendVerificationEmail(): Promise<{ message: string }> {
  return apiPost<{ message: string }>("/auth/verify/resend", {});
}

export async function passwordRegisterStart(input: {
  email: string;
  registrationRequest: string;
}): Promise<{ registrationResponse: string }> {
  return apiPost("/auth/password/register/start", input);
}

export async function passwordRegisterFinish(input: {
  email: string;
  registrationRecord: string;
}): Promise<{ ok: true }> {
  return apiPost("/auth/password/register/finish", input);
}

export async function passwordLoginStart(input: {
  email: string;
  startLoginRequest: string;
}): Promise<{ loginResponse: string; loginId: string }> {
  return apiPost("/auth/password/login/start", input);
}

export async function passwordLoginFinish(input: {
  email: string;
  loginId: string;
  finishLoginRequest: string;
}): Promise<AuthSession> {
  return apiPost("/auth/password/login/finish", input);
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  return apiPost("/auth/password/reset", { email });
}

export async function consumePasswordReset(token: string): Promise<{ resetTicket: string }> {
  return apiPost("/auth/password/reset/consume", { token });
}

export async function passwordResetRegisterStart(input: {
  resetTicket: string;
  registrationRequest: string;
}): Promise<{ registrationResponse: string }> {
  return apiPost("/auth/password/reset/register/start", input);
}

export async function passwordResetRegisterFinish(input: {
  resetTicket: string;
  registrationRecord: string;
}): Promise<AuthSession> {
  return apiPost("/auth/password/reset/register/finish", input);
}

export async function attachEmail(email: string): Promise<{ message: string; user: AuthUser }> {
  return apiPost("/auth/attach/email", { email });
}

export async function attachGoogle(idToken: string): Promise<AuthSession> {
  return apiPost("/auth/attach/google", { idToken });
}

export async function attachPasswordRegisterStart(input: {
  email: string;
  registrationRequest: string;
}): Promise<{ registrationResponse: string }> {
  return apiPost("/auth/attach/password/register/start", input);
}

export async function attachPasswordRegisterFinish(input: {
  email: string;
  registrationRecord: string;
}): Promise<AuthSession> {
  return apiPost("/auth/attach/password/register/finish", input);
}
