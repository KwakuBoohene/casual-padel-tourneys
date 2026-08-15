import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "../../../components/sheets";
import { spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";

interface LiveTournamentOptionsSheetProps {
  visible: boolean;
  canAdjustCourts: boolean;
  canFinish: boolean;
  linkCopied: boolean;
  onClose: () => void;
  onCopyShareLink: () => void;
  onOpenRenamePlayers: () => void;
  onOpenAdjustCourts: () => void;
  onOpenAddPendingPlayer: () => void;
  onOpenFinishConfirm: () => void;
}

function OptionRow(props: {
  label: string;
  detail: string;
  onPress: () => void;
  emphasized?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={{
        minHeight: touch.minPrimary,
        borderRadius: 14,
        borderWidth: props.emphasized ? 2 : 1,
        borderColor: props.emphasized ? colors.primary : colors.border,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: 4,
        opacity: props.disabled ? 0.45 : 1
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 16 }}>{props.label}</Text>
      <Text style={{ color: colors.muted, fontSize: 13 }}>{props.detail}</Text>
    </Pressable>
  );
}

export function LiveTournamentOptionsSheet(props: LiveTournamentOptionsSheetProps) {
  return (
    <BottomSheet visible={props.visible} title="Options" onDismiss={props.onClose}>
      <View style={{ gap: spacing.sm }}>
        <OptionRow
          label={props.linkCopied ? "Link copied" : "Copy viewer link"}
          detail="Spectators · read-only"
          onPress={props.onCopyShareLink}
        />
        <OptionRow
          label="Rename players"
          detail="Fix names mid-event"
          onPress={() => {
            props.onClose();
            props.onOpenRenamePlayers();
          }}
        />
        <OptionRow
          label="Adjust courts"
          detail="Recalculate remaining"
          disabled={!props.canAdjustCourts}
          onPress={() => {
            props.onClose();
            props.onOpenAdjustCourts();
          }}
        />
        <OptionRow
          label="Add pending player"
          detail="Late arrival"
          onPress={() => {
            props.onClose();
            props.onOpenAddPendingPlayer();
          }}
        />
        <OptionRow
          label="Finish tournament"
          detail={props.canFinish ? "Lock results" : "Score all matches first"}
          emphasized
          disabled={!props.canFinish}
          onPress={() => {
            props.onClose();
            props.onOpenFinishConfirm();
          }}
        />
      </View>
    </BottomSheet>
  );
}
