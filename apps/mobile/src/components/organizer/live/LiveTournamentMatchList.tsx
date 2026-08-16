import { FlashList } from "@shopify/flash-list";
import type { ScoringMode } from "@padel/shared";
import type { ReactElement } from "react";
import { View } from "react-native";

import { spacing } from "../../../theme";

import { LiveTournamentMatchCard, type LiveMatch } from "./LiveTournamentMatchCard";

interface LiveTournamentMatchListProps {
  matches: LiveMatch[];
  canEditScores: boolean;
  scoreInputs: Record<string, { scoreA: string; scoreB: string }>;
  playerNameById: Map<string, string>;
  scoringMode?: ScoringMode;
  onOpenScoreEntry: (matchId: string) => void;
  header?: ReactElement | null;
  contentContainerStyle?: object;
  style?: object;
}

export function LiveTournamentMatchList(props: LiveTournamentMatchListProps) {
  return (
    <FlashList
      data={props.matches}
      keyExtractor={(item) => item.id}
      style={props.style}
      contentContainerStyle={props.contentContainerStyle}
      ListHeaderComponent={props.header ?? null}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      renderItem={({ item }) => (
        <LiveTournamentMatchCard
          match={item}
          canEditScores={props.canEditScores}
          scoreInputs={props.scoreInputs}
          playerNameById={props.playerNameById}
          scoringMode={props.scoringMode}
          onOpenScoreEntry={props.onOpenScoreEntry}
        />
      )}
    />
  );
}
