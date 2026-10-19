/**
 * API origins for the viewer.
 *
 * There is deliberately **no fallback**. A default of `http://localhost:3004` used to hide
 * misconfiguration: pages still rendered, because server-side fetches went to the internal
 * origin, and only the browser's own requests broke — and `localhost` resolves to the visitor's
 * machine, so it could even appear to work for whoever was testing on the host. Failing loudly
 * is the point.
 */

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? stripTrailingSlash(value) : undefined;
}

const LOCAL_HOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;

/**
 * Origin for server-side fetches from inside the container. Reaches the API over the Compose
 * network, so a service name is correct here and it is never seen by a browser.
 */
export function internalApiBaseUrl(): string {
  const value = read("INTERNAL_API_BASE_URL") ?? read("PUBLIC_API_BASE_URL");
  if (!value) {
    throw new Error(
      "Neither INTERNAL_API_BASE_URL nor PUBLIC_API_BASE_URL is set. The viewer cannot reach the API."
    );
  }
  return value;
}

/**
 * Origin the **browser** calls — the live-scoring WebSocket, export downloads and the public
 * rankings fetch all derive from it. Must be reachable from a visitor's device.
 */
export function publicApiBaseUrl(): string {
  const value = read("PUBLIC_API_BASE_URL");
  if (!value) {
    throw new Error(
      "PUBLIC_API_BASE_URL is not set. The browser needs the public API origin " +
        "(for example https://api.example.com) for live scoring and downloads."
    );
  }
  if (process.env.NODE_ENV === "production" && LOCAL_HOST.test(value)) {
    throw new Error(
      `PUBLIC_API_BASE_URL is "${value}", which points at the visitor's own machine. ` +
        "Set it to the public API origin."
    );
  }
  return value;
}

/** `https` → `wss`, `http` → `ws`. Explicit so an https page can never open an insecure socket. */
export function webSocketBaseUrl(): string {
  const base = publicApiBaseUrl();
  if (base.startsWith("https://")) return `wss://${base.slice("https://".length)}`;
  if (base.startsWith("http://")) return `ws://${base.slice("http://".length)}`;
  return base;
}
