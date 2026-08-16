import { Pressable, Text } from "react-native";

import type { KohPendingPromote, KohUnit } from "@padel/shared";
import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface KohPromotePickSheetProps {
  visible: boolean;
  pending: KohPendingPromote;
  unitsById: Map<string, KohUnit>;
  saving: boolean;
  onPick: (demotedUnitId: string) => void;
}

export function KohPromotePickSheet(props: KohPromotePickSheetProps) {
  const { colors } = useTheme();
  const promoted = props.unitsById.get(props.pending.promotedUnitId);

  return (
    <BottomSheet visible={props.visible} title="Pick who moves down" onDismiss={() => undefined}>
      <Text style={{ color: colors.muted, fontSize: 13 }}>
        {promoted
          ? `${promoted.playerAName} / ${promoted.playerBName} promotes Court ${props.pending.fromCourtNumber} → ${props.pending.toCourtNumber}.`
          : "Promotion needs a demotion pick."}{" "}
        Choose the weakest pair to send down.
      </Text>
      {props.pending.candidateUnitIds.map((id) => {
        const unit = props.unitsById.get(id);
        return (
          <Pressable
            key={id}
            disabled={props.saving}
            onPress={() => props.onPick(id)}
            style={{
              minHeight: touch.minSecondary,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.md
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              {unit ? `${unit.playerAName} / ${unit.playerBName}` : id}
            </Text>
          </Pressable>
        );
      })}
      {props.saving ? <SheetButton label="Saving…" disabled onPress={() => undefined} /> : null}
    </BottomSheet>
  );
}
