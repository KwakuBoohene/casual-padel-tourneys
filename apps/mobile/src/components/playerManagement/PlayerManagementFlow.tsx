import { PageShell } from "../../layout";
import { useMergePlayers } from "../../hooks/accountPlayers/useMergePlayers";
import { usePlayerManagement } from "../../hooks/accountPlayers/usePlayerManagement";

import { PlayerManagementPanel } from "./PlayerManagementPanel";

interface PlayerManagementFlowProps {
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onBack: () => void;
  onAttach?: () => void;
}

export function PlayerManagementFlow(props: PlayerManagementFlowProps) {
  const management = usePlayerManagement({
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });
  const merge = useMergePlayers({
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired,
    onMerged: management.reload
  });

  return (
    <PageShell>
      <PlayerManagementPanel
        status={management.status}
        onStatus={management.setStatus}
        players={management.players}
        loading={management.loading}
        guestMessage={management.guestMessage}
        pending={management.pending}
        onPending={management.setPending}
        onConfirmArchive={() => void management.confirmArchive()}
        onConfirmUnarchive={() => void management.confirmUnarchive()}
        onBack={props.onBack}
        onAttach={props.onAttach}
        merge={merge}
      />
    </PageShell>
  );
}
