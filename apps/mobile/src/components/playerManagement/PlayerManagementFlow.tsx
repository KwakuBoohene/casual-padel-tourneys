import { PageShell } from "../../layout";
import { useMergePlayers } from "../../hooks/accountPlayers/useMergePlayers";
import { usePlayerManagement } from "../../hooks/accountPlayers/usePlayerManagement";
import { usePlayerSelection } from "../../hooks/accountPlayers/usePlayerSelection";

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

  const selection = usePlayerSelection(management.status);

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
        onConfirmArchive={() => {
          void management.confirmArchive().then((ok) => {
            if (ok) selection.cancel();
          });
        }}
        onConfirmUnarchive={() => {
          void management.confirmUnarchive().then((ok) => {
            if (ok) selection.cancel();
          });
        }}
        renaming={management.renaming}
        onRenaming={management.setRenaming}
        onConfirmRename={(name) => void management.confirmRename(name)}
        onBack={props.onBack}
        onAttach={props.onAttach}
        selection={selection}
        merge={merge}
      />
    </PageShell>
  );
}
