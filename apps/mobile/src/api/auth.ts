import { apiPost } from "./client";

export type AuthUser = {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  isGuest?: boolean;
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
