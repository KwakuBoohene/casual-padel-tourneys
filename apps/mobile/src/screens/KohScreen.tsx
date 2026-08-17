import { KohCreateFlow } from "../components/koh/KohCreateFlow";
import type { KohTournamentHub } from "../types/koh/create";

interface KohScreenProps {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onCancel: () => void;
  onStarted: (hub: KohTournamentHub) => void;
}

/** Thin KOH create entry — wizard UI lives in components/koh. */
export function KohScreen(props: KohScreenProps) {
  return (
    <KohCreateFlow
      setErrorText={props.setErrorText}
      markEmailVerifyRequired={props.markEmailVerifyRequired}
      onCancel={props.onCancel}
      onStarted={props.onStarted}
    />
  );
}
