import { Pressable, Text, View } from "react-native";

import { radius, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface PlayersPageActionsProps {
  canGoPrevPage: boolean;
  canGoNextPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
  onAddPlayer: () => void;
}

export function PlayersPageActions(props: PlayersPageActionsProps) {
  const { colors } = useTheme();
  const secondaryBtn = {
    minHeight: touch.minPrimary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const
  };

  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          disabled={!props.canGoPrevPage}
          onPress={props.onPrevPage}
          style={[secondaryBtn, { flex: 1, opacity: props.canGoPrevPage ? 1 : 0.4 }]}
        >
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>Prev</Text>
        </Pressable>
        <Pressable
          disabled={!props.canGoNextPage}
          onPress={props.onNextPage}
          style={[secondaryBtn, { flex: 1, opacity: props.canGoNextPage ? 1 : 0.4 }]}
        >
          <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>Next page</Text>
        </Pressable>
      </View>
      <Pressable onPress={props.onAddPlayer} style={secondaryBtn}>
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>+ Add player</Text>
      </Pressable>
    </View>
  );
}
