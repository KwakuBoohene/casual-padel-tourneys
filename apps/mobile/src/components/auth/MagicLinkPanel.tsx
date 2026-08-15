import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { radius, spacing, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

import { AuthMethodButton } from "./AuthMethodButton";

interface MagicLinkPanelProps {
  loading: boolean;
  sentMessage: string | null;
  onBack: () => void;
  onSend: (email: string) => void;
}

export function MagicLinkPanel(props: MagicLinkPanelProps) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");

  return (
    <View style={{ width: "100%", gap: spacing.md }}>
      <Pressable onPress={props.onBack}>
        <Text style={{ color: colors.muted, fontWeight: "600" }}>← Back</Text>
      </Pressable>
      <Text style={[typography.sectionTitle, { color: colors.text }]}>Email magic link</Text>
      <Text style={{ color: colors.muted, fontSize: 14, lineHeight: 20 }}>
        We will email you a one-time link to sign in. No password needed.
      </Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="you@example.com"
        placeholderTextColor={colors.muted}
        value={email}
        onChangeText={setEmail}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.text,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          fontSize: 16
        }}
      />
      <AuthMethodButton
        label="Send sign-in link"
        variant="primary"
        loading={props.loading}
        disabled={props.loading || email.trim().length < 3}
        onPress={() => props.onSend(email.trim())}
      />
      {props.sentMessage ? (
        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20 }}>{props.sentMessage}</Text>
      ) : null}
    </View>
  );
}
