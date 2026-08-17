import { useKohEditPlayers } from "../../../hooks/koh/useKohEditPlayers";
import type { KohTournamentHub } from "../../../types/koh/create";
import { PageShell } from "../../../layout";

import { KohEditPlayersPanel } from "./KohEditPlayersPanel";
import { KohEditUnitPanel } from "./KohEditUnitPanel";
import { KohEditUnitSheets } from "./KohEditUnitSheets";
import { KohReplacePartnerSheet } from "./KohReplacePartnerSheet";

interface KohEditPlayersFlowProps {
  hub: KohTournamentHub;
  setHub: (hub: KohTournamentHub) => void;
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
    const unit = edit.selected.unit;
    const record = `${unit.matchesWon ?? 0}-${unit.matchesLost ?? 0}`;
    return (
      <PageShell>
        <KohEditUnitPanel
          unit={unit}
          role={edit.selected.role}
          midMatch={edit.selected.midMatch}
          onOpenRename={edit.openRename}
          onOpenReplace={edit.openReplace}
          onBack={() => {
            edit.dismissSubflow();
            edit.setSelected(null);
          }}
        />
        <KohEditUnitSheets
          renamePlayerId={edit.renamePlayerId}
          renameValue={edit.renameValue}
          saving={edit.saving}
          onRenameValue={edit.setRenameValue}
          onDismiss={edit.dismissSubflow}
          onSubmitRename={() => void edit.submitRename()}
        />
        <KohReplacePartnerSheet
          visible={Boolean(edit.replacePlayerId)}
          confirm={edit.confirmReplace}
          leaveName={edit.leaveName}
          stayName={edit.stayName}
          joinName={edit.joinName}
          role={edit.selected.role}
          record={record}
          saving={edit.saving}
          addingNew={edit.addingNew}
          replaceName={edit.replaceName}
          selectedReplacementId={edit.selectedReplacementId}
          partners={edit.replacePartners}
          onReplaceName={edit.setReplaceName}
          onSelectReplacement={edit.selectReplacement}
          onToggleAddingNew={edit.toggleAddingNew}
          onDismiss={edit.dismissSubflow}
          onContinue={() => edit.setConfirmReplace(true)}
          onConfirm={() => void edit.submitReplace()}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <KohEditPlayersPanel
        rows={edit.units}
        onSelect={edit.setSelected}
        onBack={props.onBack}
      />
    </PageShell>
  );
}
