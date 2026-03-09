import { useMemo, useState } from "react";
import { Button, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import type { TournamentMode, TournamentVariant } from "@padel/shared";

import { apiGet, apiPost } from "../api/client";

type SetupStep = "LIST" | "NAME" | "PLAYERS" | "RULES" | "LIVE";

interface Estimate {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}

interface CreateTournamentResponse {
  data: LiveTournamentState;
}

interface LiveTournamentState {
  id: string;
  publicToken: string;
  version: number;
  updatedAt: string;
  config: { name: string; mode: TournamentMode; variant: TournamentVariant };
  players: Array<{ id: string; name: string }>;
  rounds: Array<{
    id: string;
    roundNumber: number;
    isLocked: boolean;
    matches: Array<{
      id: string;
      court: number;
      teamA: [string, string];
      teamB: [string, string];
      scoreA?: number;
      scoreB?: number;
      completed: boolean;
    }>;
  }>;
}

interface TournamentResponse {
  data: LiveTournamentState;
}

interface TournamentListResponse {
  data: LiveTournamentState[];
}

export function OrganizerScreen() {
  const [step, setStep] = useState<SetupStep>("LIST");
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [mode, setMode] = useState<TournamentMode>("AMERICANO");
  const [variant, setVariant] = useState<TournamentVariant>("CLASSIC");
  const [courtsText, setCourtsText] = useState("2");
  const [pointsText, setPointsText] = useState("24");
  const [targetGamesText, setTargetGamesText] = useState("4");
  const [tournamentTimeText, setTournamentTimeText] = useState("90");
  const [responseText, setResponseText] = useState("No tournament created yet.");
  const [errorText, setErrorText] = useState("");
  const [liveTournament, setLiveTournament] = useState<LiveTournamentState | null>(null);
  const [tournaments, setTournaments] = useState<LiveTournamentState[]>([]);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { scoreA: string; scoreB: string }>>({});

  const sanitizedPlayers = useMemo(
    () =>
      players
        .map((value) => value.trim())
        .filter(Boolean),
    [players]
  );

  const estimate = useMemo<Estimate | null>(() => {
    const courts = Number(courtsText);
    const pointsPerMatch = Number(pointsText);
    if (!Number.isFinite(courts) || !Number.isFinite(pointsPerMatch) || courts < 1 || pointsPerMatch < 1) {
      return null;
    }
    const playersPerRound = courts * 4;
    const matchTime = (pointsPerMatch * 35) / 60;
    if (playersPerRound <= 0 || sanitizedPlayers.length === 0) {
      return null;
    }
    let rounds = 0;
    if (mode === "AMERICANO") {
      const targetGames = Number(targetGamesText);
      if (!Number.isFinite(targetGames) || targetGames < 1) {
        return null;
      }
      rounds = Math.ceil((sanitizedPlayers.length * targetGames) / playersPerRound);
    } else {
      const tournamentTime = Number(tournamentTimeText);
      if (!Number.isFinite(tournamentTime) || tournamentTime < 10) {
        return null;
      }
      rounds = Math.ceil(tournamentTime / matchTime);
    }
    const durationMinutes = Math.ceil(rounds * matchTime);
    const gamesPerPlayer = Math.max(1, Math.round((rounds * playersPerRound) / sanitizedPlayers.length));
    return { rounds, gamesPerPlayer, durationMinutes };
  }, [courtsText, mode, pointsText, sanitizedPlayers.length, targetGamesText, tournamentTimeText]);

  const canContinueFromName = name.trim().length >= 2;
  const canContinueFromPlayers = sanitizedPlayers.length >= 4;
  const viewerBaseUrl = process.env.EXPO_PUBLIC_VIEWER_BASE_URL ?? "http://localhost:3000";

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of liveTournament?.players ?? []) {
      map.set(player.id, player.name);
    }
    return map;
  }, [liveTournament?.players]);

  const activeRound = useMemo(() => {
    if (!liveTournament) {
      return null;
    }
    return (
      liveTournament.rounds.find((round) => !round.isLocked) ??
      [...liveTournament.rounds].sort((a, b) => b.roundNumber - a.roundNumber)[0] ??
      null
    );
  }, [liveTournament]);

  const addPlayerInput = () => {
    setPlayers((previous) => [...previous, ""]);
  };

  const removePlayerInput = (index: number) => {
    setPlayers((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const updatePlayerName = (index: number, value: string) => {
    setPlayers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item)));
  };

  const createTournament = async () => {
    try {
      setErrorText("");
      const courts = Number(courtsText);
      const pointsPerMatch = Number(pointsText);
      const payload = {
        name: name.trim(),
        mode,
        variant,
        players: sanitizedPlayers,
        courts,
        pointsPerMatch,
        targetGamesPerPlayer: mode === "AMERICANO" ? Number(targetGamesText) : undefined,
        tournamentTimeMinutes: mode === "MEXICANO" ? Number(tournamentTimeText) : undefined
      };
      const response = await apiPost<CreateTournamentResponse>("/tournaments", payload);
      setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
      setLiveTournament(response.data);
      setTournaments((previous) => [response.data, ...previous.filter((item) => item.id !== response.data.id)]);
      setStep("LIVE");
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const loadTournaments = async () => {
    try {
      setErrorText("");
      setListRefreshing(true);
      const response = await apiGet<TournamentListResponse>("/tournaments");
      setTournaments(response.data);
    } catch (error) {
      setErrorText((error as Error).message);
    } finally {
      setListRefreshing(false);
    }
  };

  const openTournament = async (tournamentId: string) => {
    try {
      setErrorText("");
      const response = await apiGet<TournamentResponse>(`/tournaments/${tournamentId}`);
      setLiveTournament(response.data);
      setStep("LIVE");
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const refreshTournament = async () => {
    if (!liveTournament) {
      return;
    }
    try {
      const response = await apiGet<TournamentResponse>(`/tournaments/${liveTournament.id}`);
      setLiveTournament(response.data);
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const submitMatchScore = async (matchId: string) => {
    if (!liveTournament) {
      return;
    }
    const raw = scoreInputs[matchId];
    const scoreA = Number(raw?.scoreA ?? "");
    const scoreB = Number(raw?.scoreB ?? "");
    if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
      setErrorText("Enter valid numeric scores for both teams.");
      return;
    }
    try {
      setErrorText("");
      const response = await apiPost<TournamentResponse>("/tournaments/score", {
        tournamentId: liveTournament.id,
        matchId,
        scoreA,
        scoreB,
        expectedVersion: liveTournament.version
      });
      setLiveTournament(response.data);
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const updateScoreInput = (matchId: string, side: "scoreA" | "scoreB", value: string) => {
    setScoreInputs((previous) => ({
      ...previous,
      [matchId]: {
        scoreA: previous[matchId]?.scoreA ?? "",
        scoreB: previous[matchId]?.scoreB ?? "",
        [side]: value
      }
    }));
  };

  if (step === "LIST") {
    return (
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 12 }}
        refreshControl={<RefreshControl refreshing={listRefreshing} onRefresh={() => void loadTournaments()} />}
      >
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Live Tournaments</Text>
        <Button title="Pull Live Tournaments" onPress={() => void loadTournaments()} />
        <Button title="Create New Tournament" onPress={() => setStep("NAME")} />

        {tournaments.length === 0 ? <Text>No tournaments loaded yet.</Text> : null}

        {tournaments.map((tournament) => (
          <Pressable
            key={tournament.id}
            onPress={() => void openTournament(tournament.id)}
            style={{ borderWidth: 1, padding: 10, gap: 4 }}
          >
            <Text style={{ fontWeight: "700" }}>{tournament.config.name}</Text>
            <Text>
              {tournament.config.mode}/{tournament.config.variant}
            </Text>
            <Text>Players: {tournament.players.length}</Text>
            <Text>Updated: {new Date(tournament.updatedAt).toLocaleString()}</Text>
          </Pressable>
        ))}

        {errorText ? <Text style={{ color: "red" }}>Error: {errorText}</Text> : null}
      </ScrollView>
    );
  }

  if (step === "NAME") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "700" }}>Tournament Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Friday Americano"
          style={{ borderWidth: 1, padding: 10, width: "90%", maxWidth: 420 }}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Back" onPress={() => setStep("LIST")} />
          <Button title="Next" disabled={!canContinueFromName} onPress={() => setStep("PLAYERS")} />
        </View>
      </View>
    );
  }

  if (step === "PLAYERS") {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Add Players</Text>
        <Text>Players added: {sanitizedPlayers.length}</Text>
        {players.map((playerName, index) => (
          <View key={`player-${index}`} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <TextInput
              value={playerName}
              onChangeText={(value) => updatePlayerName(index, value)}
              placeholder={`Player ${index + 1}`}
              style={{ borderWidth: 1, padding: 8, flex: 1 }}
            />
            <Pressable onPress={() => removePlayerInput(index)} style={{ padding: 8, borderWidth: 1 }}>
              <Text>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Button title="Add Player" onPress={addPlayerInput} />
        <Text>Names: {sanitizedPlayers.length > 0 ? sanitizedPlayers.join(", ") : "None yet"}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title="Back" onPress={() => setStep("NAME")} />
          <Button title="Next" disabled={!canContinueFromPlayers} onPress={() => setStep("RULES")} />
        </View>
      </ScrollView>
    );
  }

  if (step === "LIVE" && liveTournament) {
    return (
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Live Tournament</Text>
        <Button title="Back To Tournament List" onPress={() => setStep("LIST")} />
        <Text>
          {liveTournament.config.name} ({liveTournament.config.mode}/{liveTournament.config.variant})
        </Text>
        <Text>Current Version: {liveTournament.version}</Text>
        <Button title="Refresh" onPress={() => void refreshTournament()} />

        <Text style={{ fontSize: 18, fontWeight: "700" }}>
          {activeRound ? `Round ${activeRound.roundNumber}` : "No active round"}
        </Text>

        {(activeRound?.matches ?? []).map((match) => (
          <View key={match.id} style={{ borderWidth: 1, padding: 10, gap: 8 }}>
            <Text style={{ fontWeight: "700" }}>Court {match.court}</Text>
            <Text>
              {playerNameById.get(match.teamA[0]) ?? match.teamA[0]} / {playerNameById.get(match.teamA[1]) ?? match.teamA[1]}
            </Text>
            <Text>
              vs {playerNameById.get(match.teamB[0]) ?? match.teamB[0]} / {playerNameById.get(match.teamB[1]) ?? match.teamB[1]}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                placeholder="Team A"
                keyboardType="numeric"
                value={scoreInputs[match.id]?.scoreA ?? (match.scoreA?.toString() ?? "")}
                onChangeText={(value) => updateScoreInput(match.id, "scoreA", value)}
                style={{ borderWidth: 1, padding: 8, flex: 1 }}
              />
              <TextInput
                placeholder="Team B"
                keyboardType="numeric"
                value={scoreInputs[match.id]?.scoreB ?? (match.scoreB?.toString() ?? "")}
                onChangeText={(value) => updateScoreInput(match.id, "scoreB", value)}
                style={{ borderWidth: 1, padding: 8, flex: 1 }}
              />
            </View>
            <Button title={match.completed ? "Update Score" : "Submit Score"} onPress={() => void submitMatchScore(match.id)} />
          </View>
        ))}

        <View style={{ marginTop: 10, borderTopWidth: 1, paddingTop: 10, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}>Shareable Link</Text>
          <Text>{`${viewerBaseUrl}/tournament/${liveTournament.publicToken}`}</Text>
        </View>

        {errorText ? <Text style={{ color: "red" }}>Error: {errorText}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Tournament Rules</Text>
      <Text>Mode</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Americano" onPress={() => setMode("AMERICANO")} />
        <Button title="Mexicano" onPress={() => setMode("MEXICANO")} />
      </View>

      <Text>Variant</Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Classic" onPress={() => setVariant("CLASSIC")} />
        <Button title="Mixed" onPress={() => setVariant("MIXED")} />
        <Button title="Team" onPress={() => setVariant("TEAM")} />
      </View>

      <Text>Courts</Text>
      <TextInput value={courtsText} onChangeText={setCourtsText} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />
      <Text>Points Per Match</Text>
      <TextInput value={pointsText} onChangeText={setPointsText} keyboardType="numeric" style={{ borderWidth: 1, padding: 8 }} />

      {mode === "AMERICANO" ? (
        <>
          <Text>Target Games Per Player</Text>
          <TextInput
            value={targetGamesText}
            onChangeText={setTargetGamesText}
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 8 }}
          />
        </>
      ) : (
        <>
          <Text>Tournament Time (minutes)</Text>
          <TextInput
            value={tournamentTimeText}
            onChangeText={setTournamentTimeText}
            keyboardType="numeric"
            style={{ borderWidth: 1, padding: 8 }}
          />
        </>
      )}

      <View style={{ borderWidth: 1, padding: 10, gap: 4 }}>
        <Text style={{ fontWeight: "700" }}>Estimated Duration</Text>
        {estimate ? (
          <>
            <Text>Rounds: {estimate.rounds}</Text>
            <Text>Approx games per player: {estimate.gamesPerPlayer}</Text>
            <Text>Estimated total time: {estimate.durationMinutes} minutes</Text>
          </>
        ) : (
          <Text>Fill in valid numeric values to see the estimate.</Text>
        )}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        <Button title="Back" onPress={() => setStep("PLAYERS")} />
        <Button title="Create Tournament" onPress={() => void createTournament()} />
      </View>
      <View>
        <Text>{responseText}</Text>
        {errorText ? <Text style={{ color: "red" }}>Error: {errorText}</Text> : null}
      </View>
    </ScrollView>
  );
}
