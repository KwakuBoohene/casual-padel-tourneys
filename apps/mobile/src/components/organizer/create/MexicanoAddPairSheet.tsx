import { Text, View } from "react-native";

import { NameSuggestField } from "../../players/NameSuggestField";
import { BottomSheet, SheetButton } from "../../sheets";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface MexicanoAddPairSheetProps {
  visible: boolean;
  title: string;
  playerA: string;
  playerB: string;
  knownNames: string[];
  usedNames: string[];
  onChangePlayerA: (value: string) => void;
  onChangePlayerB: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}

export function MexicanoAddPairSheet(props: MexicanoAddPairSheetProps) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={props.visible} title={props.title} onDismiss={props.onDismiss}>
      <View style={{ gap: spacing.md }}>
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Fixed pair for the whole night — partners stay together.
        </Text>
        <NameSuggestField
          label="PLAYER 1"
          value={props.playerA}
          onChange={props.onChangePlayerA}
          names={props.knownNames}
          usedNames={[...props.usedNames, props.playerB]}
        />
        <NameSuggestField
          label="PLAYER 2"
          value={props.playerB}
          onChange={props.onChangePlayerB}
          names={props.knownNames}
          usedNames={[...props.usedNames, props.playerA]}
        />
        <SheetButton label="Save pair" onPress={props.onSave} />
        <SheetButton label="Cancel" onPress={props.onDismiss} />
      </View>
    </BottomSheet>
  );
}
