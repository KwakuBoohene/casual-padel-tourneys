import { Text, TextInput } from "react-native";

import { BottomSheet, SheetButton } from "../../sheets";
import { radius, spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { formatKohUnitLabel } from "../../../utilities/koh/rankingFormat";

interface KohEditUnitSheetsProps {
  renamePlayerId: string | null;
  renameValue: string;
  onRenameValue: (value: string) => void;
  replacePlayerId: string | null;
  replaceName: string;
  onReplaceName: (value: string) => void;
  confirmReplace: boolean;
  leaveName: string;
  stayName: string;
  role: string;
  record: string;
  saving: boolean;
  onDismissSubflow: () => void;
  onSubmitRename: () => void;
  onContinueReplace: () => void;
  onConfirmReplace: () => void;
}

export function KohEditUnitSheets(props: KohEditUnitSheetsProps) {
  const { colors } = useTheme();
  return (
    <>
      <BottomSheet
        visible={Boolean(props.renamePlayerId)}
        title="Rename"
        onDismiss={props.onDismissSubflow}
      >
        <Text style={{ color: colors.muted, fontSize: 13 }}>
          Fix a spelling mistake. Stats stay on the same player.
        </Text>
        <TextInput
          value={props.renameValue}
          onChangeText={props.onRenameValue}
          placeholder="Player name"
          placeholderTextColor={colors.muted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            color: colors.text,
            minHeight: touch.minSecondary
          }}
        />
        <SheetButton
          label={props.saving ? "Saving…" : "Save"}
          disabled={props.saving || !props.renameValue.trim()}
          onPress={props.onSubmitRename}
        />
      </BottomSheet>

      <BottomSheet
        visible={Boolean(props.replacePlayerId) && !props.confirmReplace}
        title={`Replace ${props.leaveName}`}
        onDismiss={props.onDismissSubflow}
      >
        <TextInput
          value={props.replaceName}
          onChangeText={props.onReplaceName}
          placeholder="New partner name"
          placeholderTextColor={colors.muted}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.lg,
            padding: spacing.md,
            color: colors.text,
            minHeight: touch.minSecondary
          }}
        />
        <SheetButton
          label="Continue"
          disabled={!props.replaceName.trim()}
          onPress={props.onContinueReplace}
        />
      </BottomSheet>

      <BottomSheet
        visible={Boolean(props.replacePlayerId) && props.confirmReplace}
        title="Confirm replace"
        onDismiss={props.onDismissSubflow}
      >
        <Text style={{ color: colors.text, lineHeight: 22 }}>
          {props.leaveName} leaves · {props.replaceName.trim()} joins. Unit becomes{" "}
          {formatKohUnitLabel(props.stayName, props.replaceName.trim())}. Keeps {props.role} slot ·
          match record {props.record}.
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 20 }}>
          Past games stay on {props.leaveName}. Future games credit {props.replaceName.trim()}.
        </Text>
        <SheetButton
          label={props.saving ? "Replacing…" : "Confirm replace"}
          variant="primary"
          disabled={props.saving}
          onPress={props.onConfirmReplace}
        />
        <SheetButton label="Cancel" onPress={props.onDismissSubflow} />
      </BottomSheet>
    </>
  );
}
