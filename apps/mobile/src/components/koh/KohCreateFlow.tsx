import { AlertSheet } from "../sheets";
import { useKohCreateWizard } from "../../hooks/koh/useKohCreateWizard";
import type { KohTournamentHub } from "../../types/koh/create";

import { KohAddPairSheet } from "./KohAddPairSheet";
import { KohCreateSteps } from "./KohCreateSteps";

interface KohCreateFlowProps {
  errorText: string;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onCancel: () => void;
  onStarted: (hub: KohTournamentHub) => void;
}

export function KohCreateFlow(props: KohCreateFlowProps) {
  const wizard = useKohCreateWizard({
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired,
    onCancel: props.onCancel,
    onStarted: props.onStarted
  });

  return (
    <>
      <KohCreateSteps wizard={wizard} errorText={props.errorText} />
      <KohAddPairSheet
        visible={wizard.addPairOpen}
        courtNumber={wizard.activeCourt?.courtNumber ?? 1}
        playerA={wizard.pairA}
        playerB={wizard.pairB}
        errorText={wizard.pairError}
        onChangePlayerA={wizard.setPairA}
        onChangePlayerB={wizard.setPairB}
        onSave={wizard.savePair}
        onDismiss={() => wizard.setAddPairOpen(false)}
      />
      <AlertSheet
        visible={wizard.showRrInfo}
        variant="info"
        title="Round-robin pairs"
        message="Round-robin pairing ships in a later epic. Winner-stays is ready now."
        primaryAction={{ label: "Got it", onPress: () => wizard.setShowRrInfo(false) }}
        onDismiss={() => wizard.setShowRrInfo(false)}
      />
    </>
  );
}
