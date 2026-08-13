import { Pressable, Text, View } from "react-native";

import { BottomSheet, SheetButton } from "../../../components/sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveTournamentOptionsSheetProps {
  visible: boolean;
  currentCourts: number;
  proposedCourts: number;
  maxCourts: number;
  canAdjustCourts: boolean;
  canFinish: boolean;
  onClose: () => void;
  onChangeProposedCourts: (value: number) => void;
  onOpenAdjustCourtsConfirm: () => void;
  onCopyShareLink: () => void;
  onOpenAddPendingPlayer: () => void;
  onFinishTournament: () => void;
  onBackToList: () => void;
}

function OptionRow(props: { label: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        minHeight: touch.minSecondary,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        justifyContent: "center"
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>{props.label}</Text>
    </Pressable>
  );
}

export function LiveTournamentOptionsSheet(props: LiveTournamentOptionsSheetProps) {
  const { colors } = useTheme();

  return (
    <BottomSheet visible={props.visible} title="Options" onDismiss={props.onClose}>
      <View style={{ gap: spacing.sm }}>
        <OptionRow
          label="Copy viewer link"
          onPress={() => {
            props.onCopyShareLink();
            props.onClose();
          }}
        />
        <OptionRow
          label="Add pending"
          onPress={() => {
            props.onClose();
            props.onOpenAddPendingPlayer();
          }}
        />
        {props.canAdjustCourts ? (
          <View style={{ gap: spacing.sm }}>
            <Text style={{ fontWeight: "700", color: colors.text }}>Adjust courts</Text>
            <Text style={{ color: colors.muted }}>
              Current {props.currentCourts} · Proposed {props.proposedCourts} · Max {props.maxCourts}
            </Text>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <SheetButton
                label="-"
                style={{ flex: 1 }}
                disabled={props.proposedCourts <= 1}
                onPress={() => props.onChangeProposedCourts(Math.max(1, props.proposedCourts - 1))}
              />
              <SheetButton
                label="+"
                style={{ flex: 1 }}
                disabled={props.proposedCourts >= props.maxCourts}
                onPress={() =>
                  props.onChangeProposedCourts(Math.min(props.maxCourts, props.proposedCourts + 1))
                }
              />
            </View>
            <SheetButton label="Apply court change" variant="primary" onPress={props.onOpenAdjustCourtsConfirm} />
          </View>
        ) : null}
        {props.canFinish ? (
          <OptionRow
            label="Finish tournament"
            onPress={() => {
              props.onClose();
              props.onFinishTournament();
            }}
          />
        ) : null}
        <OptionRow
          label="Back to list"
          onPress={() => {
            props.onClose();
            props.onBackToList();
          }}
        />
      </View>
    </BottomSheet>
  );
}
