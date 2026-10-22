import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AppState, Modal, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import type { OrganizerAccount } from "@padel/shared";
import { fetchOrganizerAccounts } from "../api/organizerAccess";
import {
  pendingOrganizerWrites,
  setSelectedOrganizer,
  setOrganizerAccessLostHandler,
  setOrganizerConflictHandler
} from "../api/organizerContext";
import {
  clearOrganizerDrafts,
  readLocalValue,
  writeLocalValue
} from "../utilities/organizer/localValueStorage";
import { useAuthSessionContext } from "./AuthSessionProvider";
import { useTheme } from "../theme/ThemeProvider";
import { AccessButton } from "../components/organizerAccess/AccessButton";

interface AccountContext {
  accounts: OrganizerAccount[];
  selected: OrganizerAccount | null;
  ready: boolean;
  enabled: boolean;
  notice: string;
  refresh: () => Promise<void>;
  select: (account: OrganizerAccount) => void;
  activate: (id: string) => Promise<void>;
}
const Context = createContext<AccountContext | null>(null);
export function OrganizerAccountProvider({ children }: { children: ReactNode }) {
  const auth = useAuthSessionContext();
  const queryClient = useQueryClient();
  const { colors } = useTheme();
  const [accounts, setAccounts] = useState<OrganizerAccount[]>([]);
  const [selected, setSelected] = useState<OrganizerAccount | null>(null);
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<OrganizerAccount | null>(null);
  const selectedRef = useRef<OrganizerAccount | null>(null);
  const actorRef = useRef(auth.currentUser?.id);
  actorRef.current = auth.currentUser?.id;
  const userRef = useRef(auth.currentUser);
  userRef.current = auth.currentUser;
  const apply = useCallback(
    (account: OrganizerAccount) => {
      setSelectedOrganizer(account);
      selectedRef.current = account;
      setSelected(account);
      void queryClient.cancelQueries();
      queryClient.clear();
      if (actorRef.current)
        void writeLocalValue(`organizerSelection:${actorRef.current}`, account.id).catch(() => {});
    },
    [queryClient]
  );
  const refresh = useCallback(async () => {
    if (!auth.authToken || !auth.currentUser) return;
    const actorId = auth.currentUser.id;
    const response = await fetchOrganizerAccounts();
    if (actorRef.current !== actorId) return;
    setAccounts(response.data);
    setEnabled(Boolean(response.sharedAccessEnabled));
    const current = selectedRef.current;
    if (current && !response.data.some((account) => account.id === current.id)) {
      void clearOrganizerDrafts(actorId, current.id).catch(() => {});
      setPending(null);
      apply(response.data[0]);
      setNotice("Your access to this organizer account has been removed.");
      router.replace("/tournaments");
    }
  }, [auth.authToken, auth.currentUser, apply]);
  useEffect(() => {
    let cancelled = false;
    const actor = userRef.current;
    setReady(false);
    selectedRef.current = null;
    setSelected(null);
    setAccounts([]);
    if (!auth.authToken || !actor) {
      setSelectedOrganizer(null);
      void queryClient.cancelQueries();
      queryClient.clear();
      setReady(true);
      return;
    }
    void (async () => {
      try {
        const response = await fetchOrganizerAccounts();
        const remembered = await readLocalValue(`organizerSelection:${actor.id}`).catch(() => null);
        if (cancelled) return;
        setAccounts(response.data);
        setEnabled(Boolean(response.sharedAccessEnabled));
        apply(response.data.find((account) => account.id === remembered) ?? response.data[0]);
      } catch {
        if (cancelled) return;
        apply({
          id: actor.id,
          name: actor.name ?? "My organizer account",
          role: "OWNER",
          capabilities: { manage: true, deleteTournament: true, manageMembers: true }
        });
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  // Reinitialize only for a login/identity change, not a verification/profile refresh.
  }, [auth.authToken, auth.currentUser?.id, apply, queryClient]);
  useEffect(() => {
    setOrganizerAccessLostHandler(() => {
      if (actorRef.current && selectedRef.current)
        void clearOrganizerDrafts(actorRef.current, selectedRef.current.id).catch(() => {});
      setPending(null);
      const self = accounts.find((account) => account.id === actorRef.current);
      if (self) apply(self);
      setNotice("Your access to this organizer account has been removed.");
      router.replace("/tournaments");
      void refresh().catch(() => {});
    });
    setOrganizerConflictHandler(() => {
      void queryClient.invalidateQueries();
    });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh().catch(() => {});
    });
    const onFocus = () => void refresh().catch(() => {});
    if (typeof window !== "undefined") window.addEventListener("focus", onFocus);
    return () => {
      sub.remove();
      if (typeof window !== "undefined") window.removeEventListener("focus", onFocus);
      setOrganizerAccessLostHandler(null);
      setOrganizerConflictHandler(null);
    };
  }, [accounts, apply, refresh, queryClient]);
  const activate = async (id: string) => {
    const response = await fetchOrganizerAccounts();
    setAccounts(response.data);
    const account = response.data.find((account) => account.id === id);
    if (!account) throw new Error("This organizer account is no longer available.");
    apply(account);
  };
  return (
    <Context.Provider
      value={{
        accounts,
        selected,
        ready,
        enabled,
        notice,
        refresh,
        activate,
        select: (account) => {
          if (pendingOrganizerWrites()) {
            setNotice("Wait for the current save to finish before switching accounts.");
            return;
          }
          if (account.id !== selected?.id) setPending(account);
        }
      }}
    >
      {children}
      <Modal
        visible={Boolean(pending)}
        transparent
        animationType="fade"
        onRequestClose={() => setPending(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.65)",
            padding: 24
          }}
        >
          <View
            style={{
              maxWidth: 440,
              width: "100%",
              borderRadius: 20,
              padding: 24,
              gap: 16,
              backgroundColor: colors.surface
            }}
          >
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>
              Switch organizer account?
            </Text>
            <Text style={{ color: colors.muted }}>
              Unsaved edits and open score sheets will be closed. Your personal login stays the same.
            </Text>
            <AccessButton
              label="Switch account"
              onPress={() => {
                if (!pending || pendingOrganizerWrites()) return;
                apply(pending);
                setPending(null);
                setNotice("");
                router.replace("/tournaments");
              }}
            />
            <AccessButton label="Cancel" secondary onPress={() => setPending(null)} />
          </View>
        </View>
      </Modal>
    </Context.Provider>
  );
}
export function useOrganizerAccount() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing organizer account provider");
  return value;
}
