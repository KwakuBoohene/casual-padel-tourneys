import { Pressable, Text, TextInput, View } from "react-native";

import { radius, spacing, touch } from "../../../../theme";
import { useTheme } from "../../../../theme/ThemeProvider";

interface InviteEmailFieldProps {
  value: string;
  error: string | null;
  busy: boolean;
  onChange: (value: string) => void;
  onInvite: () => void;
}

/** Email + Invite, with server / validation errors inline under the field. */
export function InviteEmailField(props: InviteEmailFieldProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <TextInput
          accessibilityLabel="Co-organizer email"
          placeholder="Co-organizer email"
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          returnKeyType="send"
          value={props.value}
          onChangeText={props.onChange}
          onSubmitEditing={props.onInvite}
          style={{
            flex: 1,
            minHeight: touch.minSecondary,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: props.error ? colors.danger : colors.border,
            backgroundColor: colors.background,
            color: colors.text,
            paddingHorizontal: spacing.md
          }}
        />
        <Pressable
          onPress={props.onInvite}
          disabled={props.busy}
          accessibilityRole="button"
          style={{
            minHeight: touch.minSecondary,
            paddingHorizontal: spacing.lg,
            borderRadius: radius.md,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
            opacity: props.busy ? 0.5 : 1
          }}
        >
          <Text style={{ color: colors.onPrimary, fontWeight: "700" }}>{props.busy ? "Sending…" : "Invite"}</Text>
        </Pressable>
      </View>
      {props.error ? (
        <Text accessibilityRole="alert" style={{ fontSize: 13, color: colors.danger }}>
          {props.error}
        </Text>
      ) : null}
    </View>
  );
}
