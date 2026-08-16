import { Pressable, Text } from "react-native";

import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface EstimatorChoiceProps {
  label: string;
  active: boolean;
  onPress: () => void;
  flex?: boolean;
}

export function EstimatorChoice(props: EstimatorChoiceProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        flex: props.flex ? 1 : undefined,
        minHeight: touch.minSecondary,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: props.active ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: props.active ? colors.primary : colors.border,
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Text
        style={{
          color: props.active ? colors.onPrimary : colors.text,
          fontWeight: "700",
          fontSize: 13
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}
