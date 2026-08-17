import { useState } from "react";
import { Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import {
  STANDINGS_HELP_ABBREVIATIONS,
  STANDINGS_HELP_BLURB,
  STANDINGS_RANKING_STEPS
} from "@padel/shared";

import { radius, spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";
import { BottomSheet, SheetButton } from "../sheets";

function StandingsHelpSheet(props: { visible: boolean; onDismiss: () => void }) {
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  return (
    <BottomSheet visible={props.visible} title="How ranking works" onDismiss={props.onDismiss}>
      <ScrollView
        style={{ maxHeight: height * 0.55 }}
        contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.sm }}
      >
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>{STANDINGS_HELP_BLURB}</Text>
        <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
          Tap a player's name to see PW(A) and PL(A).
        </Text>
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>Abbreviations</Text>
        {STANDINGS_HELP_ABBREVIATIONS.map((row) => (
          <View key={row.abbrev} style={{ flexDirection: "row", gap: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: "700", width: 56 }}>{row.abbrev}</Text>
            <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>{row.meaning}</Text>
          </View>
        ))}
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15, marginTop: spacing.xs }}>
          Ranking order
        </Text>
        {STANDINGS_RANKING_STEPS.map((step, index) => (
          <Text key={step} style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>
            {index + 1}. {step}
          </Text>
        ))}
      </ScrollView>
      <SheetButton label="Got it" onPress={props.onDismiss} />
    </BottomSheet>
  );
}

export function StandingsHelpControl() {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="How ranking works"
        hitSlop={8}
        style={{
          minWidth: touch.minSecondary,
          minHeight: touch.minSecondary,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>?</Text>
      </Pressable>
      <StandingsHelpSheet visible={open} onDismiss={() => setOpen(false)} />
    </>
  );
}
