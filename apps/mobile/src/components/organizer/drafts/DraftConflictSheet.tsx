import { Text, View } from "react-native";

import { spacing } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import type { DraftChange } from "../../../utilities/organizer/draftDiff";
import { BottomSheet, SheetButton } from "../../sheets";

export interface DraftConflictSheetProps {
  visible: boolean;
  editorName: string;
  theirs: DraftChange[];
  mine: DraftChange[];
  onReapply: () => void;
  onDrop: () => void;
}

const noop = () => {};

interface ChangeListProps {
  title: string;
  changes: DraftChange[];
  empty: string;
}

function ChangeList({ title, changes, empty }: ChangeListProps) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.muted }}>{title}</Text>
      {changes.length === 0 ? <Text style={{ fontSize: 14, color: colors.muted }}>{empty}</Text> : null}
      {changes.map((change) => (
        <Text key={change.field} style={{ fontSize: 14, color: colors.text }}>
          • {change.label}
          {change.overwritesTheirs ? <Text style={{ color: colors.statusNext }}> · overwrites their change</Text> : null}
        </Text>
      ))}
    </View>
  );
}

/** "Sam updated this draft" (Figma 07 · `3:230`): their changes vs mine, then re-apply or drop mine. */
export function DraftConflictSheet(props: DraftConflictSheetProps) {
  const { colors } = useTheme();
  const hasMine = props.mine.length > 0;
  return (
    <BottomSheet
      visible={props.visible}
      title={`${props.editorName} updated this draft`}
      onDismiss={noop}
      dismissOnOverlay={false}
    >
      <View style={{ gap: spacing.md }}>
        <Text style={{ fontSize: 14, color: colors.muted }}>
          {hasMine
            ? "They saved while you were editing. Choose how to continue."
            : "They saved changes since you opened it. Review the latest version before you continue."}
        </Text>
        <ChangeList title={`${props.editorName.toUpperCase()}'S CHANGES`} changes={props.theirs} empty="No visible changes" />
        {hasMine ? <ChangeList title="YOUR UNSAVED CHANGES" changes={props.mine} empty="None" /> : null}
        <View style={{ gap: spacing.sm }}>
          {hasMine ? <SheetButton label="Load latest & re-apply mine" variant="primary" onPress={props.onReapply} /> : null}
          <SheetButton
            label={hasMine ? "Load latest, drop mine" : "Load latest"}
            variant={hasMine ? "secondary" : "primary"}
            onPress={props.onDrop}
          />
        </View>
      </View>
    </BottomSheet>
  );
}
