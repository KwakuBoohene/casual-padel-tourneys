import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { PlayerGender, TournamentVariant } from "@padel/shared";

import { NameSuggestField } from "../../players/NameSuggestField";
import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface AddPlayerSheetProps {
  visible: boolean;
  variant: TournamentVariant;
  initialName?: string;
  initialGender?: PlayerGender;
  title?: string;
  onDismiss: () => void;
  onSubmit: (name: string, gender: PlayerGender | undefined) => void;
  knownNames: string[];
  usedNames: string[];
}

export function AddPlayerSheet(props: AddPlayerSheetProps) {
  const { colors } = useTheme();
  const [name, setName] = useState(props.visible ? (props.initialName ?? "") : "");
  const [gender, setGender] = useState<PlayerGender | undefined>(
    props.visible ? props.initialGender : undefined
  );
  const [seed, setSeed] = useState({
    visible: props.visible,
    initialName: props.initialName,
    initialGender: props.initialGender
  });
  const isMixed = props.variant === "MIXED";
  const canSave = name.trim().length > 0 && (!isMixed || Boolean(gender));

  // Re-seed the form whenever the sheet opens or is pointed at a different player.
  if (
    seed.visible !== props.visible ||
    seed.initialName !== props.initialName ||
    seed.initialGender !== props.initialGender
  ) {
    setSeed({ visible: props.visible, initialName: props.initialName, initialGender: props.initialGender });
    if (props.visible) {
      setName(props.initialName ?? "");
      setGender(props.initialGender);
    }
  }

  return (
    <BottomSheet visible={props.visible} title={props.title ?? "Add player"} onDismiss={props.onDismiss}>
      <View style={{ gap: spacing.md }}>
        <NameSuggestField
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Player name"
          names={props.knownNames}
          usedNames={props.usedNames}
          autoFocus
        />
        {isMixed ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Gender (Mixed only)</Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              {(["MALE", "FEMALE"] as PlayerGender[]).map((value) => {
                const active = gender === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setGender(value)}
                    style={{
                      minHeight: touch.minSecondary,
                      paddingHorizontal: spacing.lg,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? "rgba(173,255,47,0.16)" : colors.surface,
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {value === "MALE" ? "Men" : "Women"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <SheetButton
          label="Save"
          variant="primary"
          disabled={!canSave}
          onPress={() => props.onSubmit(name.trim(), isMixed ? gender : undefined)}
        />
      </View>
    </BottomSheet>
  );
}
