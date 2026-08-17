import { Text, View } from "react-native";

import { usePlayerNameSuggestions } from "../../hooks/organizer/usePlayerNameSuggestions";
import { NameSuggestField } from "../players/NameSuggestField";
import { BottomSheet, SheetButton } from "../sheets";
import { spacing } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

interface KohAddPairSheetProps {
  visible: boolean;
  courtNumber: number;
  playerA: string;
  playerB: string;
  onChangePlayerA: (value: string) => void;
  onChangePlayerB: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}

export function KohAddPairSheet(props: KohAddPairSheetProps) {
  const { colors } = useTheme();
  const knownNames = usePlayerNameSuggestions();

  return (
    <BottomSheet visible={props.visible} title="Add doubles" onDismiss={props.onDismiss}>
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Court {props.courtNumber} — two players
        </Text>
        <NameSuggestField
          label="PLAYER 1"
          value={props.playerA}
          onChange={props.onChangePlayerA}
          names={knownNames}
          usedNames={[props.playerB]}
        />
        <NameSuggestField
          label="PLAYER 2"
          value={props.playerB}
          onChange={props.onChangePlayerB}
          names={knownNames}
          usedNames={[props.playerA]}
        />
        <Text style={{ color: colors.muted, fontSize: 12 }}>
          Pick a saved name if this player already has a career on your account.
        </Text>
        <SheetButton label="Save pair" onPress={props.onSave} />
        <SheetButton label="Cancel" onPress={props.onDismiss} />
      </View>
    </BottomSheet>
  );
}
