import { router } from "expo-router";

import { useEmailVerificationRefresh } from "../../src/hooks/auth/useEmailVerificationRefresh";
import { useAuthSessionContext } from "../../src/providers/AuthSessionProvider";
import { useOrganizerAccount } from "../../src/providers/OrganizerAccountProvider";
import { DraftInviteScreen } from "../../src/screens/DraftInviteScreen";

/** `/invite/draft#token=…` — public route so signed-out invitees can see the invite first. */
export default function DraftInvitationRoute() {
  useEmailVerificationRefresh();
  const auth = useAuthSessionContext();
  const account = useOrganizerAccount();
  const user = auth.currentUser;
  const signedIn = Boolean(auth.authToken && user);

  return (
    <DraftInviteScreen
      viewer={{ signedIn, isGuest: Boolean(user?.isGuest), emailVerified: Boolean(user?.emailVerified) }}
      onAccepted={(draftId) => {
        // Draft editors work from their own account, so switch back to it if a Manager account is selected.
        void (async () => {
          if (user && account.selected?.id !== user.id) await account.activate(user.id).catch(() => {});
          router.replace({ pathname: "/drafts/[id]", params: { id: draftId } });
        })();
      }}
      onDeclined={() => router.replace("/tournaments")}
      onSignIn={() => router.push("/sign-in")}
      onAttachAccount={() => router.push("/profile/attach")}
      onVerifyEmail={() => router.push("/verify")}
      onSwitchAccount={() => void auth.handleSignOut().then(() => router.replace("/sign-in"))}
      onNotNow={() => router.replace(signedIn ? "/tournaments" : "/sign-in")}
    />
  );
}
