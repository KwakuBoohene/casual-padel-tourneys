import { OrganizerAuthGate } from "./components/OrganizerAuthGate";
import { OrganizerSignedInBody } from "./components/OrganizerSignedInBody";
import { useOrganizerScreen } from "./hooks/useOrganizerScreen";

export function OrganizerScreen() {
  const org = useOrganizerScreen();

  return (
    <OrganizerAuthGate
      authReady={org.authReady}
      authToken={org.authToken}
      currentUser={org.currentUser}
      emailVerifyRequired={org.emailVerifyRequired}
      verifyBy={org.verifyBy}
      step={org.step}
      onSignedIn={org.handleSignedIn}
      onSignOut={org.handleSignOut}
      onUpdateUser={org.updateUser}
      onClearEmailVerifyRequired={org.clearEmailVerifyRequired}
      onSetStep={(step) => org.setStep(step)}
    >
      <OrganizerSignedInBody org={org} />
    </OrganizerAuthGate>
  );
}
