import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import type { KohUnit } from "@padel/shared";
import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohSwapSheetProps {
  visible: boolean;
  king: KohUnit | null;
  challenger: KohUnit | null;
  waiting: KohUnit[];
  saving: boolean;
  onSubmit: (input: {
    slot: "KING" | "CHALLENGER";
    withUnitId: string;
    reason: string;
    permanent?: boolean;
  }) => void;
  onDismiss: () => void;
}

export function KohSwapSheet(props: KohSwapSheetProps) {
  const { colors } = useTheme();
  const [slot, setSlot] = useState<"KING" | "CHALLENGER">("KING");
  const [withUnitId, setWithUnitId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [permanent, setPermanent] = useState(false);
  const candidates = props.waiting;

  return (
    <BottomSheet visible={props.visible} title="Swap" onDismiss={props.onDismiss}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>Swap king or challenger with a waiting pair.</Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        {(["KING", "CHALLENGER"] as const).map((option) => (
          <Pressable
            key={option}
            onPress={() => setSlot(option)}
            style={{
              flex: 1,
              minHeight: touch.minSecondary,
              borderRadius: radius.lg,
              borderWidth: slot === option ? 2 : 1,
              borderColor: slot === option ? colors.primary : colors.border,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>{option}</Text>
          </Pressable>
        ))}
      </View>
      {candidates.map((unit) => {
        const selected = withUnitId === unit.id;
        return (
          <Pressable
            key={unit.id}
            onPress={() => setWithUnitId(unit.id)}
            style={{
              minHeight: touch.minSecondary,
              borderRadius: radius.lg,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.primary : colors.border,
              padding: spacing.md
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "600" }}>
              {unit.playerAName} / {unit.playerBName}
            </Text>
          </Pressable>
        );
      })}
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Reason (required)"
        placeholderTextColor={colors.muted}
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.lg,
          padding: spacing.md,
          color: colors.text
        }}
      />
      {slot === "KING" ? (
        <Pressable onPress={() => setPermanent((value) => !value)}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            {permanent ? "Permanent swap" : "Temporary (default) — tap for permanent"}
          </Text>
        </Pressable>
      ) : null}
      <SheetButton
        label={props.saving ? "Saving…" : "Apply swap"}
        variant="primary"
        disabled={props.saving || !withUnitId || reason.trim().length < 1 || candidates.length === 0}
        onPress={() => {
          if (!withUnitId) return;
          props.onSubmit({
            slot,
            withUnitId,
            reason: reason.trim(),
            permanent: slot === "KING" ? permanent : true
          });
        }}
      />
    </BottomSheet>
  );
}
