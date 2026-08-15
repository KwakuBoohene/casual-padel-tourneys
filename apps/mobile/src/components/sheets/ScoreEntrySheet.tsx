import type { ReactNode } from "react";
import { Text } from "react-native";

import { touch } from "../../theme";
import { useTheme } from "../../theme/ThemeProvider";

import { BottomSheet } from "./BottomSheet";
import { ScoreEntrySideRow } from "./ScoreEntrySideRow";
import { SheetButton } from "./SheetButton";

export interface ScoreEntrySheetProps {
  visible: boolean;
  title: string;
  contextLine: string;
  teamALabel: string;
  teamBLabel: string;
  scoreA: number | null;
  scoreB: number | null;
  canUndo: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  secondarySaveLabel?: string;
  plusDisabledA?: boolean;
  plusDisabledB?: boolean;
  /** Optional slot below score rows (e.g. KOH win-method teaser). */
  extraContent?: ReactNode;
  onChangeScoreA: (next: number) => void;
  onChangeScoreB: (next: number) => void;
  onUndo: () => void;
  onSave: () => void;
  onSecondarySave?: () => void;
  onDismiss: () => void;
  min?: number;
  max?: number;
}

export function ScoreEntrySheet(props: ScoreEntrySheetProps) {
  const { colors } = useTheme();
  const min = props.min ?? 0;
  const max = props.max ?? 99;

  return (
    <BottomSheet visible={props.visible} title={props.title} onDismiss={props.onDismiss}>
      <Text style={{ color: colors.muted, fontSize: 14 }}>{props.contextLine}</Text>
      <ScoreEntrySideRow
        label={props.teamALabel}
        value={props.scoreA}
        min={min}
        max={max}
        plusDisabled={props.plusDisabledA}
        onChange={props.onChangeScoreA}
      />
      <ScoreEntrySideRow
        label={props.teamBLabel}
        value={props.scoreB}
        min={min}
        max={max}
        plusDisabled={props.plusDisabledB}
        onChange={props.onChangeScoreB}
      />
      {props.extraContent}
      <SheetButton label="Undo" disabled={!props.canUndo} onPress={props.onUndo} style={{ minHeight: touch.minPrimary }} />
      {props.secondarySaveLabel && props.onSecondarySave ? (
        <SheetButton
          label={props.secondarySaveLabel}
          disabled={props.saveDisabled}
          onPress={props.onSecondarySave}
          style={{ minHeight: touch.minPrimary }}
        />
      ) : null}
      <SheetButton
        label={props.saveLabel ?? "Save"}
        variant="primary"
        disabled={props.saveDisabled}
        onPress={props.onSave}
      />
    </BottomSheet>
  );
}
