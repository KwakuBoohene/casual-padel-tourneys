import { PageShell } from "../../layout";
import { useAccountPlayers } from "../../hooks/accountPlayers/useAccountPlayers";

import { AccountPlayerDetailPanel } from "./AccountPlayerDetailPanel";
import { AccountPlayersPanel } from "./AccountPlayersPanel";

interface AccountPlayersFlowProps {
  isGuest: boolean;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onBack: () => void;
  onAttach?: () => void;
}

export function AccountPlayersFlow(props: AccountPlayersFlowProps) {
  const players = useAccountPlayers({
    isGuest: props.isGuest,
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });

  if (players.selectedId && players.detail) {
    return (
      <PageShell>
        <AccountPlayerDetailPanel
          detail={players.detail}
          onBack={players.closeDetail}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <AccountPlayersPanel
        range={players.range}
        onRange={players.setRange}
        rows={players.board?.rows ?? []}
        loading={players.loading}
        guestMessage={players.guestMessage}
        onSelect={players.openDetail}
        onBack={props.onBack}
        onAttach={props.onAttach}
      />
    </PageShell>
  );
}
