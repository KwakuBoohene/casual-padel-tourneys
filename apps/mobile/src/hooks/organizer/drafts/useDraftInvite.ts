import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import type { DraftInvitationPreview } from "@padel/shared";

import { acceptDraftInvitation, declineDraftInvitation, previewDraftInvitation } from "../../../api/draftCollaborators";
import {
  clearPendingInvite,
  loadPendingDraftInvite,
  parseDraftInviteUrl,
  savePendingInvite
} from "../../../api/pendingOrganizerInvite";
import { draftInviteProblem, type DraftInviteProblem } from "../../../utilities/organizer/draftShareMessages";
import { draftQueryKeys } from "../../../utilities/organizer/draftQueryKeys";

/** Keep the token out of browser history and referrers once it's stored (same as `/invite/accept`). */
function scrubWebLocation() {
  if (Platform.OS !== "web") return;
  window.history.replaceState(null, "", window.location.pathname);
  const meta = document.createElement("meta");
  meta.name = "referrer";
  meta.content = "no-referrer";
  document.head.appendChild(meta);
}

interface Options {
  onAccepted: (draftId: string) => void;
  onDeclined: () => void;
}

/**
 * `/invite/draft#token=…` (Figma 06). The token is saved first so a signed-out invitee can sign in
 * or verify and come back here (`destinationAfterSignIn`).
 */
export function useDraftInvite({ onAccepted, onDeclined }: Options) {
  const queryClient = useQueryClient();
  const url = Linking.useURL();
  const [token, setToken] = useState<string | null>(null);
  const [preview, setPreview] = useState<DraftInvitationPreview | null>(null);
  const [problem, setProblem] = useState<DraftInviteProblem | null>(null);
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const incoming = parseDraftInviteUrl(Platform.OS === "web" ? window.location.href : url);
      if (incoming) await savePendingInvite({ kind: "draft", token: incoming });
      scrubWebLocation();
      const value = incoming ?? (await loadPendingDraftInvite());
      if (cancelled) return;
      if (!value) {
        setProblem({ kind: "invalid", message: "This invitation link is missing or expired. Ask the organizer to send a new one." });
        return;
      }
      setToken(value);
      try {
        const result = await previewDraftInvitation(value);
        if (!cancelled) {
          setPreview(result);
          setProblem(null);
        }
      } catch (error) {
        if (!cancelled) setProblem(draftInviteProblem(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const act = async (kind: "accept" | "decline") => {
    if (!token || busy) return;
    setBusy(kind);
    setProblem(null);
    try {
      if (kind === "accept") {
        const result = await acceptDraftInvitation(token);
        await clearPendingInvite();
        void queryClient.invalidateQueries({ queryKey: draftQueryKeys.all });
        onAccepted(result.draftId);
      } else {
        await declineDraftInvitation(token);
        await clearPendingInvite();
        onDeclined();
      }
    } catch (error) {
      setProblem(draftInviteProblem(error, preview?.invitedByName));
    } finally {
      setBusy(null);
    }
  };

  return {
    preview,
    problem,
    busy,
    accept: () => void act("accept"),
    decline: () => void act("decline"),
    /** "Not now": forget the invite on this device. */
    dismiss: () => void clearPendingInvite()
  };
}

export type DraftInviteController = ReturnType<typeof useDraftInvite>;
