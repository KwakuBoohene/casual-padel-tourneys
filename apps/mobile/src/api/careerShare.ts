import { apiDelete, apiGet, apiPost } from "./client";

interface CareerShareResponse {
  data: { token: string | null };
}

export async function fetchCareerShare(): Promise<string | null> {
  const response = await apiGet<CareerShareResponse>("/me/career-share");
  return response.data.token;
}

export async function enableCareerShare(): Promise<string | null> {
  const response = await apiPost<CareerShareResponse>("/me/career-share", {});
  return response.data.token;
}

export async function rotateCareerShare(): Promise<string | null> {
  const response = await apiPost<CareerShareResponse>("/me/career-share/rotate", {});
  return response.data.token;
}

export async function revokeCareerShare(): Promise<string | null> {
  const response = await apiDelete<CareerShareResponse>("/me/career-share");
  return response.data.token;
}
