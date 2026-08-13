import { useState } from "react";
import { View } from "react-native";

import { AlertSheet, BottomSheet, SheetButton } from "../../../components/sheets";
import { spacing } from "../../../theme";

import type { LiveTournamentState } from "../types";

import { TournamentListView } from "./TournamentListView";

interface OrganizerListScreenProps {
  tournaments: LiveTournamentState[];
  refreshing: boolean;
  errorText: string;
  showTournamentOptionsModal: boolean;
  showTournamentActionConfirmModal: boolean;
  pendingTournamentAction: "EDIT" | "DELETE" | null;
  onRefresh: () => void;
  onCreateAmericano: () => void;
  onCreateMexicano: () => void;
  onOpenEstimator: () => void;
  onOpenTournament: (id: string) => void;
  onOpenOptions: (id: string) => void;
  onOpenProfile: () => void;
  onCloseOptionsModal: () => void;
  onRequestEdit: () => void;
  onRequestDelete: () => void;
  onCancelActionConfirm: () => void;
  onConfirmAction: () => void;
}

export function OrganizerListScreen(props: OrganizerListScreenProps) {
  const isDelete = props.pendingTournamentAction === "DELETE";
  const [showKohComingSoon, setShowKohComingSoon] = useState(false);

  return (
    <>
      <TournamentListView
        tournaments={props.tournaments}
        refreshing={props.refreshing}
        errorText={props.errorText}
        onRefresh={props.onRefresh}
        onCreateAmericano={props.onCreateAmericano}
        onCreateMexicano={props.onCreateMexicano}
        onCreateKingOfTheHill={() => setShowKohComingSoon(true)}
        onOpenEstimator={props.onOpenEstimator}
        onOpenTournament={props.onOpenTournament}
        onOpenOptions={props.onOpenOptions}
        onOpenProfile={props.onOpenProfile}
      />

      <BottomSheet
        visible={props.showTournamentOptionsModal}
        title="Tournament Options"
        onDismiss={props.onCloseOptionsModal}
      >
        <View style={{ gap: spacing.sm }}>
          <SheetButton label="Edit Tournament" onPress={props.onRequestEdit} />
          <SheetButton label="Delete Tournament" variant="danger" onPress={props.onRequestDelete} />
          <SheetButton label="Cancel" onPress={props.onCloseOptionsModal} />
        </View>
      </BottomSheet>

      <AlertSheet
        visible={props.showTournamentActionConfirmModal}
        variant={isDelete ? "warning" : "info"}
        title={isDelete ? "Delete Tournament?" : "Edit Tournament?"}
        message={
          isDelete
            ? "Are you sure you want to delete this tournament?"
            : "Are you sure you want to edit this tournament?"
        }
        primaryAction={{
          label: "Yes",
          onPress: props.onConfirmAction,
          destructive: isDelete
        }}
        secondaryAction={{ label: "Cancel", onPress: props.onCancelActionConfirm }}
        onDismiss={props.onCancelActionConfirm}
      />

      <AlertSheet
        visible={showKohComingSoon}
        variant="info"
        title="King of the Hill is next"
        message="King of the Hill create flow ships in a later epic. Americano and Mexicano are ready now."
        primaryAction={{ label: "Got it", onPress: () => setShowKohComingSoon(false) }}
        onDismiss={() => setShowKohComingSoon(false)}
      />
    </>
  );
}
