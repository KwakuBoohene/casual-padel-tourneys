import type { ReactNode } from "react";

import { AttachAccountScreen } from "../../screens/AttachAccountScreen";
import type { AuthSession, AuthUser } from "../../api/auth";

/**
 * Thin post-auth gate: attach-account only.
 * Sign-in / password / reset / magic / verify live under `app/(auth)/`.
 */
export interface OrganizerAuthGateProps {
  authReady: boolean;
  authToken: string | null;
  currentUser: AuthUser | null;
  emailVerifyRequired: boolean;
  verifyBy?: number;
  step: string;
  onSignedIn: (session: AuthSession) => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  onUpdateUser: (user: AuthUser) => void | Promise<void>;
  onClearEmailVerifyRequired: () => void;
  onSetStep: (step: "LIST" | "PROFILE" | "ATTACH") => void;
  children: ReactNode;
}

export function OrganizerAuthGate(props: OrganizerAuthGateProps) {
  if (props.step === "ATTACH") {
    return (
      <AttachAccountScreen
        onBack={() => props.onSetStep("PROFILE")}
        onAttached={(session) => {
          void props.onSignedIn(session);
          props.onSetStep("LIST");
        }}
        onEmailPending={(user) => void props.onUpdateUser(user)}
      />
    );
  }

  return <>{props.children}</>;
}
