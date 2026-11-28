import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  inviteDraftEditor,
  removeDraftEditor,
  resendDraftInvitation,
  revokeDraftInvitation,
  updateDraftSettings
} from "../../../api/draftCollaborators";
import { getDraftPeople } from "../../../api/drafts";
import { draftQueryKeys } from "../../../utilities/organizer/draftQueryKeys";
import { inviteEmailProblem, inviteErrorMessage } from "../../../utilities/organizer/draftShareMessages";

type ShareAction =
  | { type: "invite"; email: string }
  | { type: "resend"; invitationId: string }
  | { type: "revoke"; invitationId: string }
  | { type: "remove"; userId: string }
  | { type: "keepAccess"; value: boolean };

const busyKey = (action: ShareAction) =>
  action.type === "invite" ? "invite" : action.type === "keepAccess" ? "keepAccess" : `${action.type}:${"userId" in action ? action.userId : action.invitationId}`;

function perform(draftId: string, action: ShareAction): Promise<unknown> {
  switch (action.type) {
    case "invite":
      return inviteDraftEditor(draftId, action.email.trim().toLowerCase());
    case "resend":
      return resendDraftInvitation(draftId, action.invitationId);
    case "revoke":
      return revokeDraftInvitation(draftId, action.invitationId);
    case "remove":
      return removeDraftEditor(draftId, action.userId);
    case "keepAccess":
      return updateDraftSettings(draftId, action.value);
  }
}

/** Share sheet (Figma 05): who has access, invites, and the keep-access-after-start setting. */
export function useDraftSharing(draftId: string, ownEmail?: string | null) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const people = useQuery({
    queryKey: draftQueryKeys.people(draftId),
    queryFn: () => getDraftPeople(draftId),
    enabled: open,
    retry: false
  });

  const mutation = useMutation({
    mutationFn: (action: ShareAction) => perform(draftId, action),
    onSuccess: (_result, action) => {
      if (action.type === "invite") {
        setEmail("");
        setNotice(`Invitation sent to ${action.email.trim().toLowerCase()}.`);
      } else if (action.type === "resend") setNotice("Invitation sent again.");
      else setNotice(null);
      setConfirmRemove(null);
      void queryClient.invalidateQueries({ queryKey: draftQueryKeys.people(draftId) });
      void queryClient.invalidateQueries({ queryKey: draftQueryKeys.detail(draftId) });
      void queryClient.invalidateQueries({ queryKey: draftQueryKeys.list() });
    },
    onError: (error, action) => {
      const message = inviteErrorMessage(error);
      if (action.type === "invite" || action.type === "resend") setEmailError(message);
      else setNotice((error as Error).message || "Couldn't update access. Try again.");
    }
  });

  const run = (action: ShareAction) => {
    setEmailError(null);
    setNotice(null);
    mutation.mutate(action);
  };

  return {
    visible: open,
    people: people.data ?? null,
    loading: people.isPending && open,
    loadError: people.error ? (people.error as Error).message : null,
    email,
    emailError,
    notice,
    busy: mutation.isPending ? busyKey(mutation.variables) : null,
    confirmRemove,
    open: () => setOpen(true),
    close: () => {
      setOpen(false);
      setEmailError(null);
      setNotice(null);
      setConfirmRemove(null);
    },
    setEmail: (value: string) => {
      setEmail(value);
      setEmailError(null);
    },
    invite: () => {
      const problem = inviteEmailProblem(email, ownEmail);
      if (problem) setEmailError(problem);
      else run({ type: "invite", email });
    },
    resend: (invitationId: string) => run({ type: "resend", invitationId }),
    revoke: (invitationId: string) => run({ type: "revoke", invitationId }),
    /** First tap asks; second tap removes. */
    remove: (userId: string) => (confirmRemove === userId ? run({ type: "remove", userId }) : setConfirmRemove(userId)),
    setKeepAccess: (value: boolean) => run({ type: "keepAccess", value })
  };
}

export type DraftSharingController = ReturnType<typeof useDraftSharing>;
