declare global {
  interface Window {
    __PADEL_CONFIG__?: { apiBaseUrl: string };
  }
}

/** Only the public origin is shipped to browsers; container-internal addresses stay private. */
export function resolvePublicApiBaseUrl(raw: string | undefined, production = true): string {
  const value = raw?.trim().replace(/\/+$/, "");
  if (!value) throw new Error("PUBLIC_API_BASE_URL is not set. Configure the viewer's public API origin.");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("PUBLIC_API_BASE_URL must be an absolute HTTP(S) origin.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("PUBLIC_API_BASE_URL must be an absolute HTTP(S) origin.");
  }
  if (production && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error("PUBLIC_API_BASE_URL points at the visitor's own machine. Set the public API origin.");
  }
  return url.origin;
}

export function publicApiBaseUrl(): string {
  const origin = resolvePublicApiBaseUrl(window.__PADEL_CONFIG__?.apiBaseUrl, import.meta.env.PROD);
  if (window.location.protocol === "https:" && origin.startsWith("http:")) {
    throw new Error("PUBLIC_API_BASE_URL must use HTTPS when the viewer uses HTTPS.");
  }
  return origin;
}

export function webSocketBaseUrl(): string {
  return publicApiBaseUrl().replace(/^http/, "ws");
}
