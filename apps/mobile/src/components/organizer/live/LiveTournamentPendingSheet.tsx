import type { PlayerGender } from "@padel/shared";
import { Text, View } from "react-native";

import { usePlayerNameSuggestions } from "../../../hooks/organizer/usePlayerNameSuggestions";
import { NameSuggestField } from "../../players/NameSuggestField";
import { BottomSheet, SheetButton } from "../../sheets";
import { spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import type { LiveTournamentState } from "../../../types/organizer/tournament";

interface LiveTournamentPendingSheetProps {
  tournament: LiveTournamentState;
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
  const knownNames = usePlayerNameSuggestions();
  const usedNames = [
    ...props.tournament.players.map((player) => player.name),
    ...props.tournament.pendingPlayers.map((player) => player.name)
  ];

  return (
    <BottomSheet visible={props.visible} title="Add pending player" onDismiss={props.onClose}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>
        Joins when you integrate · pick a saved name if they already play with you
      </Text>
      <NameSuggestField
        value={props.nameDraft}
        onChange={props.onChangeName}
        names={knownNames}
        usedNames={usedNames}
        placeholder="Player name"
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
