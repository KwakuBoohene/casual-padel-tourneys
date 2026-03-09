import { useMemo, useState } from "react";
import { Button, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { TournamentMode, TournamentVariant } from "@padel/shared";

import { apiPost } from "../api/client";

type SetupStep = "NAME" | "PLAYERS" | "RULES";

interface Estimate {
  rounds: number;
  gamesPerPlayer: number;
  durationMinutes: number;
}

interface CreateTournamentResponse {
  data: { id: string; publicToken: string };
}

export function OrganizerScreen() {
  const [step, setStep] = useState<SetupStep>("NAME");
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
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

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
        <Button title="Next" disabled={!canContinueFromName} onPress={() => setStep("PLAYERS")} />
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
