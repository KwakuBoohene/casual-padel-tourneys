import { ScrollView, Text } from "react-native";
import type { OrganizerManagedPlayer } from "@padel/shared";

import { AlertSheet, BottomSheet, SheetButton } from "../sheets";
import { useTheme } from "../../theme/ThemeProvider";
import { spacing } from "../../theme";

export function ArchiveConfirmSheet(props: {
  players: OrganizerManagedPlayer[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = props.players.length;
  const name = props.players[0]?.name ?? "";
  const title = count === 1 ? `Archive ${name}?` : `Archive ${count} players?`;
  const message =
    count === 1
      ? `${name} will leave the account leaderboard and name suggestions. You can add a new ${name} to events.`
      : `${count} players will leave the account leaderboard and name suggestions. You can reuse those names in events.`;
  return (
    <AlertSheet
      visible={count > 0}
      variant="warning"
      title={title}
      message={message}
      primaryAction={{ label: count === 1 ? "Archive" : `Archive ${count}`, onPress: props.onConfirm, destructive: true }}
      secondaryAction={{ label: "Cancel", onPress: props.onCancel }}
      onDismiss={props.onCancel}
    />
  );
}

export function UnarchiveConfirmSheet(props: {
  players: OrganizerManagedPlayer[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const count = props.players.length;
  const name = props.players[0]?.suggestedRestoreName ?? props.players[0]?.name ?? "";
  const title = count === 1 ? "Unarchive player?" : `Unarchive ${count} players?`;
  const message =
    count === 1
      ? `Restored as ${name}.`
      : "Each player is restored with a unique name if the original is already in use.";
  return (
    <AlertSheet
      visible={count > 0}
      variant="info"
      title={title}
      message={message}
      primaryAction={{
        label: count === 1 ? "Unarchive" : `Unarchive ${count}`,
        onPress: props.onConfirm
      }}
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
