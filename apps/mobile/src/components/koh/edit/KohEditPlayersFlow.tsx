import { useKohEditPlayers } from "../../../hooks/koh/useKohEditPlayers";
import type { KohTournamentHub } from "../../../types/koh/create";
import { PageShell } from "../../../layout";

import { KohEditPlayersPanel } from "./KohEditPlayersPanel";
import { KohEditUnitPanel } from "./KohEditUnitPanel";

interface KohEditPlayersFlowProps {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
  errorText: string;
  setErrorText: (value: string) => void;
  markEmailVerifyRequired: (dueAt?: number) => void;
  onBack: () => void;
}

export function KohEditPlayersFlow(props: KohEditPlayersFlowProps) {
  const edit = useKohEditPlayers({
    hub: props.hub,
    setHub: props.setHub,
    setErrorText: props.setErrorText,
    markEmailVerifyRequired: props.markEmailVerifyRequired
  });

  if (edit.selected) {
    return (
      <PageShell>
        <KohEditUnitPanel
          unit={edit.selected.unit}
          role={edit.selected.role}
          midMatch={edit.selected.midMatch}
          renamePlayerId={edit.renamePlayerId}
          renameValue={edit.renameValue}
          onRenameValue={edit.setRenameValue}
          replacePlayerId={edit.replacePlayerId}
          replaceName={edit.replaceName}
          onReplaceName={edit.setReplaceName}
          confirmReplace={edit.confirmReplace}
          leaveName={edit.leaveName}
          stayName={edit.stayName}
          saving={edit.saving}
          errorText={props.errorText}
          onOpenRename={edit.openRename}
          onOpenReplace={edit.openReplace}
          onDismissSubflow={edit.dismissSubflow}
          onSubmitRename={() => void edit.submitRename()}
          onContinueReplace={() => edit.setConfirmReplace(true)}
          onConfirmReplace={() => void edit.submitReplace()}
          onBack={() => {
            edit.dismissSubflow();
            edit.setSelected(null);
          }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <KohEditPlayersPanel
        rows={edit.units}
        errorText={props.errorText}
        onSelect={edit.setSelected}
        onBack={props.onBack}
      />
    </PageShell>
  );
}
