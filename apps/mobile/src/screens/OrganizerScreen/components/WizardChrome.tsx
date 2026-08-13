import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useBreakpoint } from "../../../layout";
import { radius, spacing, touch, typography } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

export interface WizardChromeProps {
  modeLabel: string;
  stepIndex: number;
  stepCount: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  onBack?: () => void;
  backLabel?: string;
  /** Extra actions pinned above the primary footer (e.g. page nav + add). */
  footerExtra?: ReactNode;
}

export function WizardChrome(props: WizardChromeProps) {
  const { colors } = useTheme();
  const { formMaxWidth } = useBreakpoint();
  const progress = `${props.modeLabel} · Step ${props.stepIndex} of ${props.stepCount}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.xxl,
          paddingBottom: spacing.md,
          gap: spacing.md,
          maxWidth: formMaxWidth,
          width: "100%",
          alignSelf: "center",
          flexGrow: 1
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 13, fontWeight: "500", color: colors.primary }}>{progress}</Text>
        <Text style={[typography.title, { color: colors.text }]}>{props.title}</Text>
        {props.subtitle ? (
          <Text style={{ fontSize: 13, color: colors.muted }}>{props.subtitle}</Text>
        ) : null}
        {props.children}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
          paddingTop: spacing.sm,
          gap: spacing.sm,
          maxWidth: formMaxWidth,
          width: "100%",
          alignSelf: "center",
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background
        }}
      >
        {props.footerExtra}
        {props.onBack ? (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              onPress={props.onBack}
              style={{
                flex: 1,
                minHeight: touch.minPrimary,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "600", fontSize: 17 }}>
                {props.backLabel ?? "Back"}
              </Text>
            </Pressable>
            <Pressable
              disabled={props.primaryDisabled}
              onPress={props.onPrimary}
              style={{
                flex: 1,
                minHeight: touch.minPrimary,
                borderRadius: radius.lg,
                backgroundColor: props.primaryDisabled ? colors.surfaceAlt : colors.primary,
                alignItems: "center",
                justifyContent: "center",
                opacity: props.primaryDisabled ? 0.5 : 1
              }}
            >
              <Text
                style={{
                  color: props.primaryDisabled ? colors.text : colors.onPrimary,
                  fontWeight: "700",
                  fontSize: 17
                }}
              >
                {props.primaryLabel}
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            disabled={props.primaryDisabled}
            onPress={props.onPrimary}
            style={{
              minHeight: touch.minPrimary,
              borderRadius: radius.lg,
              backgroundColor: props.primaryDisabled ? colors.surfaceAlt : colors.primary,
              alignItems: "center",
              justifyContent: "center",
              opacity: props.primaryDisabled ? 0.5 : 1
            }}
          >
            <Text
              style={{
                color: props.primaryDisabled ? colors.text : colors.onPrimary,
                fontWeight: "700",
                fontSize: 17
              }}
            >
              {props.primaryLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
