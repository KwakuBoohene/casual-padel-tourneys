import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "expo-router";
import { Switch, Text, View } from "react-native";
import { createGa4Consent, ga4Device, type OrganizerGa4Action } from "@padel/shared";
import { getAuthToken } from "../../api/client";
import { sendOrganizerGa4 } from "../../api/ga4.web";
import { useAuthSessionContext } from "../../providers/AuthSessionProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { organizerFeature } from "../../utilities/analytics/organizerFeature";

const Context = createContext<((action: OrganizerGa4Action) => boolean)>(() => false);
export const useOrganizerGa4 = () => useContext(Context);

const browserStorage = (kind: "localStorage" | "sessionStorage") => ({
  get: (key: string) => window[kind].getItem(key),
  set: (key: string, value: string) => window[kind].setItem(key, value),
  delete: (key: string) => { window[kind].removeItem(key); return true; }
});

export function OrganizerGa4({ children }: { children: ReactNode }) {
  const { currentUser, authToken } = useAuthSessionContext();
  if (process.env.EXPO_PUBLIC_ORGANIZER_GA4_ENABLED !== "true" || !currentUser || !authToken) return <>{children}</>;
  return <SignedInAnalytics key={currentUser.id} actor={currentUser.id} token={authToken}>{children}</SignedInAnalytics>;
}

function SignedInAnalytics({ children, actor, token }: { children: ReactNode; actor: string; token: string }) {
  const path = usePathname();
  const feature = organizerFeature(path);
  const { colors } = useTheme();
  const consent = useMemo(() => createGa4Consent(`padel-organizer-ga4-v1:${actor}`, {
    consent: browserStorage("localStorage"),
    session: browserStorage("sessionStorage"),
    uuid: () => crypto.randomUUID(),
    now: Date.now,
    device: () => ga4Device(navigator.userAgent, navigator.maxTouchPoints)
  }), [actor]);
  const [allowed, setAllowed] = useState(() => consent.choice() === "allowed");
  const previous = useRef<string | null>(null);
  const active = useRef(true);
  const featureRef = useRef(feature);
  useLayoutEffect(() => {
    // Expo updates its route state before the browser finishes updating history.
    featureRef.current = feature;
  }, [feature]);
  useEffect(() => {
    active.current = true;
    const update = () => setAllowed(consent.choice() === "allowed");
    window.addEventListener("storage", update);
    return () => {
      active.current = false;
      window.removeEventListener("storage", update);
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
      {feature && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: colors.surface }}>
          <Switch
            accessibilityLabel="Allow Google Analytics for Organizer web"
            value={allowed}
            onValueChange={(value) => {
              consent.choose(value);
              setAllowed(consent.choice() === "allowed");
            }}
          />
          <Text style={{ color: colors.text, flex: 1 }}>Share screen types and setup progress with Google Analytics (optional)</Text>
        </View>
      )}
      {children}
    </Context.Provider>
  );
}
