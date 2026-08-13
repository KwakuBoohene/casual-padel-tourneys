import { Modal, Pressable, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface AuthErrorSheetProps {
  visible: boolean;
  title?: string;
  message: string;
  onDismiss: () => void;
}

export function AuthErrorSheet(props: AuthErrorSheetProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  return (
    <Modal
      transparent
      visible={props.visible}
      animationType="slide"
      onRequestClose={props.onDismiss}
    >
      <Pressable
        onPress={props.onDismiss}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end"
        }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          style={{
            backgroundColor: colors.surfaceAlt,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
            padding: spacing.lg,
            paddingBottom: spacing.xl,
            gap: spacing.md,
            width: "100%",
            maxWidth: formMaxWidth,
            alignSelf: "center"
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 40,
              height: 4,
              borderRadius: radius.pill,
              backgroundColor: colors.border,
              marginBottom: spacing.xs
            }}
          />
          <Text style={[typography.sectionTitle, { color: colors.text }]}>
            {props.title ?? "Something went wrong"}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 22 }}>{props.message}</Text>
          <Pressable
            onPress={props.onDismiss}
            style={{
              marginTop: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.primary,
              alignItems: "center"
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>OK</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
