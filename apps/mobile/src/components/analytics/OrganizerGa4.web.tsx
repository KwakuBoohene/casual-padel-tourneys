import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { createGa4Consent, ga4Device, type OrganizerGa4Action } from "@padel/shared";
import { getAuthToken } from "../../api/client";
import { sendOrganizerGa4 } from "../../api/ga4.web";
import { useAuthSessionContext } from "../../providers/AuthSessionProvider";
import { syncOrganizerConsent } from "../../utilities/analytics/organizerConsent";
import { organizerFeature } from "../../utilities/analytics/organizerFeature";

const Context = createContext<((action: OrganizerGa4Action) => boolean)>(() => false);
export const useOrganizerGa4 = () => useContext(Context);

const browserStorage = (kind: "localStorage" | "sessionStorage") => ({
  get: (key: string) => window[kind].getItem(key),
  set: (key: string, value: string) => window[kind].setItem(key, value),
  delete: (key: string) => { window[kind].removeItem(key); return true; }
});

export function OrganizerGa4({ children, allowed }: { children: ReactNode; allowed: boolean | null }) {
  const { currentUser, authToken } = useAuthSessionContext();
  if (process.env.EXPO_PUBLIC_ORGANIZER_GA4_ENABLED !== "true" || !currentUser || !authToken) return <>{children}</>;
  return <SignedInAnalytics key={currentUser.id} actor={currentUser.id} token={authToken} allowed={allowed}>{children}</SignedInAnalytics>;
}

function SignedInAnalytics({ children, actor, token, allowed }: { children: ReactNode; actor: string; token: string; allowed: boolean | null }) {
  const path = usePathname();
  const feature = organizerFeature(path);
  const consent = useMemo(() => createGa4Consent(`padel-organizer-ga4-v1:${actor}`, {
    consent: browserStorage("localStorage"),
    session: browserStorage("sessionStorage"),
    uuid: () => crypto.randomUUID(),
    now: Date.now,
    device: () => ga4Device(navigator.userAgent, navigator.maxTouchPoints)
  }), [actor]);
  useLayoutEffect(() => {
    // The shared Usage analytics choice owns consent; the GA4 store only holds its anonymous identity.
    syncOrganizerConsent(consent, allowed);
  }, [allowed, consent]);
  const previous = useRef<string | null>(null);
  const active = useRef(true);
  const featureRef = useRef(feature);
  useLayoutEffect(() => {
    // Expo updates its route state before the browser finishes updating history.
    featureRef.current = feature;
  }, [feature]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, [consent]);
  const send = useCallback((action: OrganizerGa4Action): boolean => {
    if (!active.current || !allowed || getAuthToken() !== token) return false;
    const currentFeature = featureRef.current;
    if (!currentFeature || (action.event === "page_view" ? currentFeature !== action.feature : currentFeature !== "setup"))
      return false;
    const envelope = consent.envelope();
    if (!envelope) return false;
    sendOrganizerGa4(token, { ...envelope, ...action });
    return true;
  }, [allowed, consent, token]);
  useEffect(() => {
    if (!feature || !allowed) previous.current = null;
    else if (path !== previous.current && send({ event: "page_view", feature })) previous.current = path;
  }, [allowed, feature, path, send]);
  return (
    <Context.Provider value={send}>
      {children}
    </Context.Provider>
  );
}
