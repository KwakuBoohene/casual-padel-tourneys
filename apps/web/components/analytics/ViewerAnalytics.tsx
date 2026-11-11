import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { createGa4Consent, ga4Device, type ViewerGa4Action } from "@padel/shared";
import { publicApiBaseUrl } from "../../lib/apiConfig";
import { isViewerAnalyticsRoute, viewerAcquisition } from "../../lib/viewerGa4";

const key = "padel-viewer-ga4-v1";
const browserStorage = (kind: "localStorage" | "sessionStorage") => ({
  get: (key: string) => window[kind].getItem(key),
  set: (key: string, value: string) => window[kind].setItem(key, value),
  delete: (key: string) => { window[kind].removeItem(key); return true; }
});
const consent = createGa4Consent(key, {
  consent: browserStorage("localStorage"),
  session: browserStorage("sessionStorage"),
  uuid: () => crypto.randomUUID(),
  now: Date.now,
  device: () => ga4Device(navigator.userAgent, navigator.maxTouchPoints)
});

const Context = createContext({ allowed: false });
export function ViewerAnalytics({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const enabled = window.__PADEL_CONFIG__?.ga4Enabled === true;
  const [choice, setChoice] = useState(consent.choice);
  const [settings, setSettings] = useState(false);
  useEffect(() => {
    const update = () => setChoice(consent.choice());
    window.addEventListener("storage", update);
    return () => window.removeEventListener("storage", update);
  }, []);
  const allowedRoute = enabled && isViewerAnalyticsRoute(pathname);
  function choose(allow: boolean) {
    consent.choose(allow);
    setChoice(consent.choice());
    setSettings(false);
  }
  return (
    <Context.Provider value={{ allowed: allowedRoute && choice === "allowed" }}>
      {allowedRoute && (
        <div className="mx-auto max-w-6xl px-5 py-4 text-sm text-padel-muted">
          {choice === "unset" || settings ? (
            <section aria-label="Optional Viewer analytics" className="space-y-2">
              <p>Allow Google Analytics to measure which Viewer pages people use?</p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="min-h-11 rounded-lg border border-padel-border px-3" onClick={() => choose(true)}>
                  Allow analytics
                </button>
                <button type="button" className="min-h-11 rounded-lg border border-padel-border px-3" onClick={() => choose(false)}>
                  {choice === "allowed" ? "Turn off analytics" : "Decline"}
                </button>
              </div>
            </section>
          ) : <button type="button" className="min-h-11 underline" onClick={() => setSettings(true)}>Analytics settings</button>}
        </div>
      )}
      {children}
    </Context.Provider>
  );
}

export function ViewerPageView({ page }: { page: ViewerGa4Action["page"] }) {
  const { allowed } = useContext(Context);
  const { key } = useLocation();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (!allowed) {
      previous.current = null;
      return;
    }
    if (previous.current === key) return;
    const envelope = consent.envelope();
    if (!envelope) return;
    previous.current = key;
    const event: ViewerGa4Action = {
      event: "page_view", page, acquisition: viewerAcquisition(document.referrer, window.location.origin)
    };
    void fetch(`${publicApiBaseUrl()}/analytics/ga4/viewer`, {
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      redirect: "error",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...envelope, ...event })
    }).catch(() => {});
  }, [allowed, key, page]);
  return null;
}
