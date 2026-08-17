import { ScrollView, Text } from "react-native";
import type { OrganizerManagedPlayer } from "@padel/shared";

import { AlertSheet, BottomSheet, SheetButton } from "../sheets";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme";

export function ArchiveConfirmSheet(props: {
  player: OrganizerManagedPlayer | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = props.player?.name ?? "";
  return (
    <AlertSheet
      visible={Boolean(props.player)}
      variant="warning"
      title={`Archive ${name}?`}
      message={`${name} will leave the account leaderboard and name suggestions. You can add a new ${name} to events.`}
      primaryAction={{ label: "Archive", onPress: props.onConfirm, destructive: true }}
      secondaryAction={{ label: "Cancel", onPress: props.onCancel }}
      onDismiss={props.onCancel}
    />
  );
}

export function UnarchiveConfirmSheet(props: {
  player: OrganizerManagedPlayer | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const name = props.player?.suggestedRestoreName ?? props.player?.name ?? "";
  return (
    <AlertSheet
      visible={Boolean(props.player)}
      variant="info"
      title="Unarchive player?"
      message={`Restored as ${name}.`}
      primaryAction={{ label: "Unarchive", onPress: props.onConfirm }}
      secondaryAction={{ label: "Cancel", onPress: props.onCancel }}
      onDismiss={props.onCancel}
    />
  );
}

export function MergePickSheet(props: {
  visible: boolean;
  players: OrganizerManagedPlayer[];
  playerA: OrganizerManagedPlayer | null;
  playerB: OrganizerManagedPlayer | null;
  onSelect: (player: OrganizerManagedPlayer) => void;
  onContinue: () => void;
  onDismiss: () => void;
}) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={props.visible} title="Merge players" onDismiss={props.onDismiss}>
      <Text style={{ color: colors.muted, marginBottom: spacing.md }}>
        Pick two active players. We’ll create one career and archive both names.
      </Text>
      <ScrollView style={{ maxHeight: 320 }}>
        {props.players.map((player) => {
          const selected = player.id === props.playerA?.id || player.id === props.playerB?.id;
          return (
            <SheetButton
              key={player.id}
              label={`${selected ? "✓ " : ""}${player.name}  ${player.matchesWon}–${player.matchesLost}`}
              variant={selected ? "primary" : "secondary"}
              onPress={() => props.onSelect(player)}
            />
          );
        })}
      </ScrollView>
      <SheetButton
        label="Continue"
        variant="primary"
        disabled={!props.playerA || !props.playerB}
        onPress={props.onContinue}
      />
      <SheetButton label="Cancel" onPress={props.onDismiss} />
    </BottomSheet>
  );
}
