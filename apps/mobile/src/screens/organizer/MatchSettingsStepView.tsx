import { Button, ScrollView, Text, TextInput, View } from "react-native";
import type { SchedulingMode } from "@padel/shared";

import type { Estimate } from "./types";

interface MatchSettingsStepViewProps {
  schedulingMode: SchedulingMode;
  courtsText: string;
  pointsText: string;
  targetGamesText: string;
  tournamentTimeText: string;
  estimate: Estimate | null;
  responseText: string;
  errorText: string;
  playersCount: number;
  onChangeCourts: (value: string) => void;
  onChangePoints: (value: string) => void;
  onChangeTargetGames: (value: string) => void;
  onChangeTournamentTime: (value: string) => void;
  onBack: () => void;
  onCreate: () => void;
}

export function MatchSettingsStepView(props: MatchSettingsStepViewProps) {
  const courts = Number(props.courtsText);
  const minPlayersForCourts = Number.isFinite(courts) && courts > 0 ? courts * 4 : 0;
  const hasEnoughPlayersForCourts =
    Number.isFinite(courts) && courts > 0 && props.playersCount >= minPlayersForCourts;

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Match Settings</Text>
      <Text>Courts</Text>
      <TextInput value={props.courtsText} onChangeText={props.onChangeCourts} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
      {!hasEnoughPlayersForCourts && minPlayersForCourts > 0 ? (
        <Text style={{ color: "red" }}>
          {courts} court{courts === 1 ? "" : "s"} need at least {minPlayersForCourts} players; you currently have{" "}
          {props.playersCount}.
        </Text>
      ) : null}
      <Text>Points Per Match</Text>
      <TextInput value={props.pointsText} onChangeText={props.onChangePoints} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />

      {props.schedulingMode === "TARGET_GAMES" ? (
        <>
          <Text>Target Games Per Player</Text>
          <TextInput value={props.targetGamesText} onChangeText={props.onChangeTargetGames} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
        </>
      ) : null}

      {props.schedulingMode === "TOTAL_TIME" ? (
        <>
          <Text>Tournament Time (minutes)</Text>
          <TextInput
            value={props.tournamentTimeText}
            onChangeText={props.onChangeTournamentTime}
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 8 }}
          />
        </>
      ) : null}

      <View style={{ borderWidth: 1, padding: 10, gap: 4 }}>
        <Text style={{ fontWeight: "700" }}>Estimated Duration</Text>
        {props.estimate && hasEnoughPlayersForCourts ? (
          <>
            <Text>Rounds: {props.estimate.rounds}</Text>
            <Text>Approx games per player: {props.estimate.gamesPerPlayer}</Text>
            <Text>Estimated total time: {props.estimate.durationMinutes} minutes</Text>
          </>
        ) : (
          <Text>Fill in valid numeric values to see the estimate.</Text>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={props.onBack} />
        <Button title="Create Tournament" onPress={props.onCreate} disabled={!hasEnoughPlayersForCourts} />
      </View>
      <View>
        <Text>{props.responseText}</Text>
        {props.errorText ? <Text style={{ color: "red" }}>Error: {props.errorText}</Text> : null}
      </View>
    </ScrollView>
  );
}
