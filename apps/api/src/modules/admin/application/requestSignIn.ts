import type { AdminAccessStore } from "./access.js";

export interface AdminSignInServices {
  findUser(email: string): Promise<{ id: string } | null>;
  issueToken(userId: string, expiresAt: Date): Promise<string>;
  sendLink(email: string, token: string): Promise<void>;
}

export async function requestAdminSignIn(
  store: AdminAccessStore,
  services: AdminSignInServices,
  email: string,
  enabled: boolean
): Promise<void> {
  if (!enabled) return;
  const normalized = email.trim().toLowerCase();
  const user = await services.findUser(normalized);
  if (!user || !(await store.isAdmin(user.id))) return;
  const token = await services.issueToken(user.id, new Date(Date.now() + 15 * 60_000));
  await services.sendLink(normalized, token);
}
