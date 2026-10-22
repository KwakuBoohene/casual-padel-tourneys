import { router } from "expo-router";
import { useEffect, useState } from "react";

import { VerifyGateScreen } from "../../src/screens/VerifyGateScreen";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";
import { useEmailVerificationRefresh } from "../../src/hooks/auth/useEmailVerificationRefresh";
import { destinationAfterSignIn, loadPendingOrganizerInvite } from "../../src/api/pendingOrganizerInvite";
import { previewOrganizerInvitation } from "../../src/api/organizerAccess";

export default function VerifyRoute() {
  const auth = useAuthSessionContext();
  const [invitationOrganizerName, setInvitationOrganizerName] = useState<string>();
  useEmailVerificationRefresh();
  useEffect(() => {
    let cancelled = false;
    void loadPendingOrganizerInvite().then(async (token) => {
      if (!token) return;
      try {
        const preview = await previewOrganizerInvitation(token);
        if (!cancelled) setInvitationOrganizerName(preview.data.organizerName);
      } catch {}
    });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!auth.currentUser?.emailVerified) return;
    let cancelled = false;
    void destinationAfterSignIn().then((destination) => {
      if (!cancelled) router.replace(destination);
    });
    return () => { cancelled = true; };
  }, [auth.currentUser?.emailVerified]);

  return (
    <VerifyGateScreen
      email={auth.currentUser?.email}
      verifyBy={auth.verifyBy}
      invitationOrganizerName={invitationOrganizerName}
      onCheckVerification={async () => Boolean((await auth.refreshUser())?.emailVerified)}
      onSignOut={async () => {
        await auth.handleSignOut();
        router.replace("/sign-in");
      }}
    />
  );
}
