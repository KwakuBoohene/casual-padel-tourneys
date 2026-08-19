import { Pressable, Text, View } from "react-native";

import { BottomSheet } from "../../sheets";
import { TournamentConfigSummaryPanel } from "../TournamentConfigSummaryPanel";
import { spacing, touch } from "../../../theme";
import { useTheme } from "../../../theme/ThemeProvider";
import { CareerOptInRow } from "../create/CareerOptInRow";
import type { ConfigSummaryRow } from "../../../utilities/organizer/tournamentConfigSummary";
import { finishOptionDetail } from "../../../utilities/organizer/closeTournamentCopy";

interface LiveTournamentOptionsSheetProps {
  visible: boolean;
  canAdjustCourts: boolean;
  canFinish: boolean;
  unfinishedMatchCount: number;
  isMexicano: boolean;
  isTournamentCompleted: boolean;
  isEditingCompletedTournament: boolean;
  allowEditAfterComplete: boolean;
  endedAt?: string | null;
  configRows: ConfigSummaryRow[];
  linkCopied: boolean;
  onClose: () => void;
  onCopyShareLink: () => void;
  onOpenRenamePlayers: () => void;
  onOpenAdjustCourts: () => void;
  onOpenAddPendingPlayer: () => void;
  onOpenEditGame: () => void;
  onOpenFinishConfirm: () => void;
  onBackToList: () => void;
  contributeToCareerLeaderboard: boolean;
  careerSaving: boolean;
  onSetContributeToCareerLeaderboard: (value: boolean) => void;
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
  const showFinishInOptions = !props.isTournamentCompleted || props.isMexicano;
  const canEditGame =
    props.allowEditAfterComplete &&
    props.isTournamentCompleted &&
    !props.isEditingCompletedTournament &&
    !props.endedAt;

  return (
    <BottomSheet visible={props.visible} title="Options" onDismiss={props.onClose}>
      <View style={{ gap: spacing.sm }}>
        <TournamentConfigSummaryPanel rows={props.configRows} />
        <CareerOptInRow
          value={props.contributeToCareerLeaderboard}
          disabled={props.careerSaving}
          onChange={props.onSetContributeToCareerLeaderboard}
        />
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
        {props.canAdjustCourts ? (
          <OptionRow
            label="Adjust courts"
            detail="Recalculate remaining"
            onPress={() => {
              props.onClose();
              props.onOpenAdjustCourts();
            }}
          />
        ) : null}
        {!props.isMexicano ? (
          <OptionRow
            label="Add pending player"
            detail="Late arrival"
            onPress={() => {
              props.onClose();
              props.onOpenAddPendingPlayer();
            }}
          />
        ) : null}
        {props.allowEditAfterComplete && props.isTournamentCompleted ? (
          <OptionRow
            label="Edit game"
            detail={
              props.endedAt
                ? "Unavailable after finish"
                : props.isEditingCompletedTournament
                  ? "Already editing scores"
                  : "Fix scores before finishing"
            }
            disabled={!canEditGame}
            onPress={() => {
              props.onClose();
              props.onOpenEditGame();
            }}
          />
        ) : null}
        {showFinishInOptions ? (
          <OptionRow
            label={props.isMexicano ? "End night" : "Finish tournament"}
            detail={finishOptionDetail(props.canFinish, props.unfinishedMatchCount)}
            emphasized
            disabled={!props.canFinish}
            onPress={() => {
              props.onClose();
              props.onOpenFinishConfirm();
            }}
          />
        ) : null}
        <OptionRow
          label="Home"
          detail="Back to tournaments"
          onPress={() => {
            props.onClose();
            props.onBackToList();
          }}
        />
      </View>
    </BottomSheet>
  );
}
