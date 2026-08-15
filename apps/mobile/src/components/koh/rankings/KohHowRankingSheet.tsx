import { Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohHowRankingSheetProps {
  visible: boolean;
  onDismiss: () => void;
}

const STEPS = [
  "Wins–losses",
  "More golden/star losses ranks higher if tied",
  "Game differential",
  "Organizer pick for promo"
];

export function KohHowRankingSheet(props: KohHowRankingSheetProps) {
  const { colors } = useTheme();
  return (
    <BottomSheet visible={props.visible} title="How ranking works" onDismiss={props.onDismiss}>
      <View style={{ gap: spacing.sm }}>
        {STEPS.map((step, index) => (
          <Text key={step} style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
            {index + 1}. {step}
          </Text>
        ))}
        <Text style={{ color: colors.muted, marginTop: spacing.sm, lineHeight: 20 }}>
          Weakest = bottom of This court. Court 1 is the top of the ladder. Rankings are doubles
          pairs, not individual career boards.
        </Text>
      </View>
      <SheetButton label="Got it" onPress={props.onDismiss} />
    </BottomSheet>
  );
}
