import { View } from "react-native";
import type { ScoringMode } from "@padel/shared";

import { spacing } from "../../../theme";

import { ScoringModeOptionCard } from "./ScoringModeOptionCard";

interface ScoringModePhaseProps {
  scoringMode: ScoringMode;
  onChangeScoringMode: (value: ScoringMode) => void;
}

export function ScoringModePhase(props: ScoringModePhaseProps) {
  const isRegular = props.scoringMode === "REGULAR";
  return (
    <View style={{ gap: spacing.md }}>
      <ScoringModeOptionCard
        title="Regular scoring"
        lines={["On court: 15 · 30 · 40.", "In the app: tap who won each game (5–4)."]}
        selected={isRegular}
        onPress={() => props.onChangeScoringMode("REGULAR")}
      />
      <ScoringModeOptionCard
        title="Americano scoring (single points)"
        lines={["Each rally is one point. Play to a target (e.g. 24)."]}
        selected={!isRegular}
        onPress={() => props.onChangeScoringMode("AMERICANO_POINTS")}
      />
    </View>
  );
}
