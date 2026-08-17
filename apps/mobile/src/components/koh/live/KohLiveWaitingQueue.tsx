import { Text, View } from "react-native";

import type { KohUnit } from "@padel/shared";
import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { KohLiveUnitCard } from "./KohLiveCourtBits";

export function KohLiveWaitingQueue({ units }: { units: KohUnit[] }) {
  const { colors } = useTheme();
  if (units.length === 0) return null;

  return (
    <View
      style={{
        marginTop: spacing.xs,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: spacing.sm
      }}
    >
      <Text
        style={{
          color: colors.muted,
          fontWeight: "700",
          fontSize: 12,
          letterSpacing: 1.4,
          textTransform: "uppercase"
        }}
      >
        Waiting queue
      </Text>
      {units.map((unit) => (
        <KohLiveUnitCard key={unit.id} label="WAIT" unit={unit} quiet />
      ))}
    </View>
  );
}
