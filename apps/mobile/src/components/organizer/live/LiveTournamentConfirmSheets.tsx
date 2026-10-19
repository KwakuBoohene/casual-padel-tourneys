import { AlertSheet } from "../../sheets";
import {
  finishPrimaryLabel,
  finishSheetMessage,
  finishSheetTitle
} from "../../../utilities/organizer/closeTournamentCopy";

interface LiveTournamentConfirmSheetsProps {
  showEditConfirmModal: boolean;
  showAdjustCourtsConfirmModal: boolean;
  showIntegrateConfirmModal: boolean;
  showFinishConfirmModal: boolean;
  isMexicano?: boolean;
  currentCourts: number;
  proposedCourts: number;
  pendingCount: number;
  unfinishedMatchCount: number;
  onCloseEditConfirm: () => void;
  onConfirmEditGame: () => void;
  onCloseAdjustCourtsConfirm: () => void;
  onConfirmAdjustCourts: () => void;
  onCloseIntegrateConfirm: () => void;
  onConfirmIntegratePendingPlayers: () => void;
  onCloseFinishConfirm: () => void;
  onConfirmFinishTournament: () => void;
}

export function LiveTournamentConfirmSheets(props: LiveTournamentConfirmSheetsProps) {
  return (
    <>
      <AlertSheet
        visible={props.showEditConfirmModal}
        variant="warning"
        title="Edit Completed Tournament?"
        message="Are you sure you want to unlock this tournament and edit round scores?"
        primaryAction={{ label: "Yes, Edit Game", onPress: props.onConfirmEditGame }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseEditConfirm }}
        onDismiss={props.onCloseEditConfirm}
      />
      <AlertSheet
        visible={props.showAdjustCourtsConfirmModal}
        variant="warning"
        title="Adjust Courts?"
        message={`Are you sure you want to change courts from ${props.currentCourts} to ${props.proposedCourts}? Remaining rounds will be recalculated.`}
        primaryAction={{ label: "Yes, Reassign Games", onPress: props.onConfirmAdjustCourts }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseAdjustCourtsConfirm }}
        onDismiss={props.onCloseAdjustCourtsConfirm}
      />
      <AlertSheet
        visible={props.showIntegrateConfirmModal}
        variant="warning"
        title="Integrate Players?"
        message={`Integrate ${props.pendingCount} waiting player${
          props.pendingCount !== 1 ? "s" : ""
        } into the tournament?`}
        primaryAction={{ label: "Confirm", onPress: props.onConfirmIntegratePendingPlayers }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseIntegrateConfirm }}
        onDismiss={props.onCloseIntegrateConfirm}
      />
      <AlertSheet
        visible={props.showFinishConfirmModal}
        variant="warning"
        title={finishSheetTitle(Boolean(props.isMexicano), props.unfinishedMatchCount)}
        message={finishSheetMessage(props.unfinishedMatchCount)}
        primaryAction={{
          label: finishPrimaryLabel(Boolean(props.isMexicano), props.unfinishedMatchCount),
          onPress: props.onConfirmFinishTournament,
          destructive: props.isMexicano || props.unfinishedMatchCount > 0
        }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseFinishConfirm }}
        onDismiss={props.onCloseFinishConfirm}
      />
    </>
  );
}
