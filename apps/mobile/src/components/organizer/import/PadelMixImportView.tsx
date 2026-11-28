import { ActivityIndicator, Pressable, ScrollView, Text, TextInput } from "react-native";

import type { PadelMixImportForm } from "../../../hooks/organizer/usePadelMixImport";
import { useBreakpoint } from "../../../layout";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface PadelMixImportViewProps {
  form: PadelMixImportForm;
  onBack: () => void;
}

export function PadelMixImportView({ form, onBack }: PadelMixImportViewProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: spacing.xl,
        paddingTop: spacing.xxl,
        gap: spacing.md,
        maxWidth: formMaxWidth,
        width: "100%",
        alignSelf: "center"
      }}
    >
      <Text accessibilityRole="header" style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>
        Import from PadelMix
      </Text>
      <Text style={{ color: colors.muted, fontSize: 15, lineHeight: 21 }}>
        Paste the live link of a classic Americano. Players, courts, points and the full round schedule are
        copied over, along with any scores already entered.
      </Text>
      <TextInput
        accessibilityLabel="PadelMix live link"
        value={form.link}
        onChangeText={form.setLink}
        onSubmitEditing={form.submit}
        editable={!form.importing}
        placeholder="https://padelmix.app/live/ABC123"
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        style={{
          color: colors.text,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: form.errorText ? colors.danger : colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.lg,
          minHeight: touch.minPrimary,
          fontSize: 16
        }}
      />
      {form.errorText ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger, fontSize: 14 }}>
          {form.errorText}
        </Text>
      ) : null}
      <Pressable
        onPress={form.submit}
        disabled={!form.canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Import tournament"
        accessibilityState={{ disabled: !form.canSubmit, busy: form.importing }}
        style={{
          minHeight: touch.minPrimary,
          borderRadius: radius.lg,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          opacity: form.canSubmit ? 1 : 0.5
        }}
      >
        {form.importing ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={{ color: colors.onPrimary, fontWeight: "700", fontSize: 17 }}>Import tournament</Text>
        )}
      </Pressable>
      <Pressable
        onPress={onBack}
        disabled={form.importing}
        accessibilityRole="button"
        accessibilityLabel="Back to tournaments"
        style={{ minHeight: touch.minSecondary, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ color: colors.text, fontWeight: "600", fontSize: 15 }}>Back</Text>
      </Pressable>
    </ScrollView>
  );
}
