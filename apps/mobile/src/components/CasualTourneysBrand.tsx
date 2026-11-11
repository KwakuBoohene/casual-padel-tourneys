import { Text } from "react-native";

import { useTheme } from "../theme/ThemeProvider";

export function CasualTourneysBrand({ fontSize = 15 }: { fontSize?: number }) {
  const { colors } = useTheme();
  return <Text numberOfLines={1} style={{ color: colors.text, fontWeight: "700", fontSize, letterSpacing: -0.15 }}>Casual Tourneys</Text>;
}
