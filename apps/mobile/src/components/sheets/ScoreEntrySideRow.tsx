import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { spacing, touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

function parseScore(raw: string, min: number, max: number): number | null {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

interface ScoreEntrySideRowProps {
  label: string;
  value: number | null;
  min: number;
  max: number;
  plusDisabled?: boolean;
  onChange: (next: number) => void;
}

export function ScoreEntrySideRow(props: ScoreEntrySideRowProps) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(props.value === null ? "" : String(props.value));
  const current = props.value ?? 0;

  useEffect(() => {
    if (!focused) {
      setText(props.value === null ? "" : String(props.value));
    }
  }, [props.value, focused]);

  const commitText = (raw: string) => {
    const cleaned = digitsOnly(raw);
    setText(cleaned);
    const parsed = parseScore(cleaned, props.min, props.max);
    if (parsed !== null) props.onChange(parsed);
  };

  const finishEditing = () => {
    setFocused(false);
    if (text.trim() === "") {
      setText(props.value === null ? "" : String(props.value));
      return;
    }
    const parsed = parseScore(text, props.min, props.max);
    if (parsed !== null) {
      props.onChange(parsed);
      setText(String(parsed));
      return;
    }
    const n = Number(digitsOnly(text));
    if (Number.isFinite(n)) {
      const clamped = Math.max(props.min, Math.min(props.max, Math.trunc(n)));
      props.onChange(clamped);
      setText(String(clamped));
      return;
    }
    setText(props.value === null ? "" : String(props.value));
  };

  const chip = (symbol: string, next: number, disabled: boolean) => (
    <Pressable
      onPress={() => props.onChange(next)}
      disabled={disabled}
      style={{
        minWidth: touch.minPrimary,
        minHeight: touch.minPrimary,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : 1
      }}
    >
      <Text style={{ color: colors.primary, fontSize: 28, fontWeight: "700" }}>{symbol}</Text>
    </Pressable>
  );

  return (
    <View
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        padding: spacing.md,
        gap: spacing.sm
      }}
    >
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600" }}>{props.label}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {chip("−", props.value === null ? 0 : current - 1, props.value !== null && current <= props.min)}
        <TextInput
          value={focused ? text : props.value === null ? "" : String(props.value)}
          onChangeText={commitText}
          onFocus={() => {
            setFocused(true);
            setText(props.value === null ? "" : String(props.value));
          }}
          onBlur={finishEditing}
          keyboardType="number-pad"
          inputMode="numeric"
          selectTextOnFocus
          placeholder="–"
          placeholderTextColor={colors.muted}
          maxLength={String(props.max).length}
          style={{
            color: colors.text,
            fontSize: 36,
            fontWeight: "700",
            minWidth: 72,
            minHeight: touch.minPrimary,
            textAlign: "center",
            padding: 0
          }}
        />
        {chip("+", props.value === null ? 0 : current + 1, Boolean(props.plusDisabled) || (props.value !== null && current >= props.max))}
      </View>
    </View>
  );
}
