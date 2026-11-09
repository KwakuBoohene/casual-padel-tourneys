/** Native crash reporting is intentionally a separate integration. */
export function initSentry(): void {}
export function captureClientError(_error: unknown): void {}
export function monitoredFetch(url: string, init: RequestInit): Promise<Response> {
  return fetch(url, init);
}
