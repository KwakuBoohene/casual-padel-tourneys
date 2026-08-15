import type { PlayerGender } from "@padel/shared";
import { Text, TextInput, View } from "react-native";

import { AlertSheet, BottomSheet, SheetButton } from "../../../components/sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../types";

interface LiveTournamentPendingSheetProps {
  tournament: LiveTournamentState;
  errorText: string;
  visible: boolean;
  nameDraft: string;
  gender: PlayerGender | undefined;
  onClose: () => void;
  onChangeName: (value: string) => void;
  onChangeGender: (gender: PlayerGender) => void;
  onSubmit: () => void;
}

export function LiveTournamentPendingSheet(props: LiveTournamentPendingSheetProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={props.visible} title="Add pending player" onDismiss={props.onClose}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        Joins when you integrate · may page if many
      </Text>
      <TextInput
        placeholder="Player name"
        value={props.nameDraft}
        onChangeText={props.onChangeName}
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.sm,
          minHeight: touch.minSecondary,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          color: colors.text
        }}
      />
      {props.tournament.config.variant === "MIXED" ? (
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {(["MALE", "FEMALE"] as const).map((gender) => (
            <SheetButton
              key={gender}
              label={gender === "MALE" ? "M" : "F"}
              variant={props.gender === gender ? "primary" : "secondary"}
              style={{ flex: 1 }}
              onPress={() => props.onChangeGender(gender)}
            />
          ))}
        </View>
      ) : null}
      {props.errorText ? <Text style={{ color: colors.danger, fontSize: 12 }}>{props.errorText}</Text> : null}
      <SheetButton label="Cancel" onPress={props.onClose} style={{ minHeight: touch.minPrimary }} />
      <SheetButton
        label="Add player"
        variant="primary"
        disabled={!props.nameDraft.trim()}
        onPress={props.onSubmit}
      />
    </BottomSheet>
  );
}

interface LiveTournamentConfirmSheetsProps {
  showEditConfirmModal: boolean;
  showAdjustCourtsConfirmModal: boolean;
  showIntegrateConfirmModal: boolean;
  showFinishConfirmModal: boolean;
  currentCourts: number;
  proposedCourts: number;
  pendingCount: number;
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
        title="Finish tournament?"
        message="Results will be locked."
        primaryAction={{ label: "Finish", onPress: props.onConfirmFinishTournament }}
        secondaryAction={{ label: "Cancel", onPress: props.onCloseFinishConfirm }}
        onDismiss={props.onCloseFinishConfirm}
      />
    </>
  );
}
