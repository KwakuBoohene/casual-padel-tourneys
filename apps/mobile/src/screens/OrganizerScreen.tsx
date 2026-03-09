import { useMemo, useState } from "react";
import { Button, Modal, Text, View } from "react-native";
import type { PlayerGender, SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { apiDelete, apiGet, apiPost } from "../api/client";
import { LeaderboardView } from "./organizer/LeaderboardView";
import { LiveTournamentView } from "./organizer/LiveTournamentView";
import { MatchSettingsStepView } from "./organizer/MatchSettingsStepView";
import { NameStepView } from "./organizer/NameStepView";
import { PlayerGamesView } from "./organizer/PlayerGamesView";
import { PlayersStepView } from "./organizer/PlayersStepView";
import { TournamentListView } from "./organizer/TournamentListView";
import { TournamentOptionsStepView } from "./organizer/TournamentOptionsStepView";
import type { CreateTournamentResponse, SetupStep, TournamentListResponse, TournamentResponse } from "./organizer/types";
import { buildLeaderboardRows, buildPlayerGameRows, computeEstimate } from "./organizer/utils";

export function OrganizerScreen() {
  const [step, setStep] = useState<SetupStep>("LIST");
  const [name, setName] = useState("");
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [playerGenders, setPlayerGenders] = useState<Array<PlayerGender | undefined>>([undefined, undefined, undefined, undefined]);
  const [mode, setMode] = useState<TournamentMode>("AMERICANO");
  const [variant, setVariant] = useState<TournamentVariant>("CLASSIC");
  const [schedulingMode, setSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [courtsText, setCourtsText] = useState("2");
  const [pointsText, setPointsText] = useState("24");
  const [targetGamesText, setTargetGamesText] = useState("4");
  const [tournamentTimeText, setTournamentTimeText] = useState("90");
  const [responseText, setResponseText] = useState("No tournament created yet.");
  const [errorText, setErrorText] = useState("");
  const [liveTournament, setLiveTournament] = useState<TournamentResponse["data"] | null>(null);
  const [tournaments, setTournaments] = useState<TournamentListResponse["data"]>([]);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
  const [pendingTournamentAction, setPendingTournamentAction] = useState<"EDIT" | "DELETE" | null>(null);
  const [showTournamentOptionsModal, setShowTournamentOptionsModal] = useState(false);
  const [showTournamentActionConfirmModal, setShowTournamentActionConfirmModal] = useState(false);
  const [liveTournamentNameDraft, setLiveTournamentNameDraft] = useState("");
  const [scoreInputs, setScoreInputs] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [isEditingCompletedTournament, setIsEditingCompletedTournament] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);

  const viewerBaseUrl = process.env.EXPO_PUBLIC_VIEWER_BASE_URL ?? "http://localhost:3000";
  const effectiveSchedulingMode: SchedulingMode = mode === "MEXICANO" ? "TOTAL_TIME" : schedulingMode;

  const sanitizedPlayers = useMemo(() => players.map((value) => value.trim()).filter(Boolean), [players]);
  const estimate = useMemo(
    () =>
      computeEstimate({
        courtsText,
        pointsText,
        mode,
        schedulingMode: effectiveSchedulingMode,
        targetGamesText,
        tournamentTimeText,
        playersCount: sanitizedPlayers.length
      }),
    [courtsText, effectiveSchedulingMode, mode, pointsText, sanitizedPlayers.length, targetGamesText, tournamentTimeText]
  );

  const canContinueFromName = name.trim().length >= 2;
  const canContinueFromPlayers = useMemo(() => {
    if (sanitizedPlayers.length < 4) {
      return false;
    }
    if (variant !== "MIXED") {
      return true;
    }
    return players.every((value, index) => value.trim().length === 0 || Boolean(playerGenders[index]));
  }, [playerGenders, players, sanitizedPlayers.length, variant]);

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

  const isTournamentCompleted = useMemo(() => {
    if (!liveTournament) {
      return false;
    }
    return liveTournament.rounds.every((round) => round.matches.every((match) => match.completed));
  }, [liveTournament]);

  const isLastRound = useMemo(() => {
    if (!activeRound || !liveTournament) {
      return false;
    }
    const highestRound = Math.max(...liveTournament.rounds.map((round) => round.roundNumber));
    return activeRound.roundNumber === highestRound;
  }, [activeRound, liveTournament]);

  const leaderboardRows = useMemo(() => (liveTournament ? buildLeaderboardRows(liveTournament) : []), [liveTournament]);
  const selectedPlayerGames = useMemo(() => {
    if (!liveTournament || !selectedPlayerId) {
      return [];
    }
    return buildPlayerGameRows({
      tournament: liveTournament,
      selectedPlayerId,
      playerNameById
    });
  }, [liveTournament, playerNameById, selectedPlayerId]);

  const addPlayerInput = () => {
    setPlayers((previous) => [...previous, ""]);
    setPlayerGenders((previous) => [...previous, undefined]);
  };

  const removePlayerInput = (index: number) => {
    setPlayers((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
    setPlayerGenders((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  };

  const updatePlayerName = (index: number, value: string) =>
    setPlayers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item)));

  const updatePlayerGender = (index: number, value: PlayerGender) =>
    setPlayerGenders((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item)));

  const createTournament = async () => {
    try {
      setErrorText("");
      const payload = {
        name: name.trim(),
        mode,
        variant,
        schedulingMode: effectiveSchedulingMode,
        players: players
          .map((playerName, index) => ({
            name: playerName.trim(),
            gender: variant === "MIXED" ? playerGenders[index] : undefined
          }))
          .filter((item) => item.name.length > 0),
        courts: Number(courtsText),
        pointsPerMatch: Number(pointsText),
        targetGamesPerPlayer: effectiveSchedulingMode === "TARGET_GAMES" ? Number(targetGamesText) : undefined,
        tournamentTimeMinutes: effectiveSchedulingMode === "TOTAL_TIME" ? Number(tournamentTimeText) : undefined
      };
      const response = await apiPost<CreateTournamentResponse>("/tournaments", payload);
      setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
      setLiveTournament(response.data);
      setLiveTournamentNameDraft(response.data.config.name);
      setTournaments((previous) => [response.data, ...previous.filter((item) => item.id !== response.data.id)]);
      setIsEditingCompletedTournament(false);
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

  const openTournament = async (tournamentId: string, editMode = false) => {
    try {
      setErrorText("");
      const response = await apiGet<TournamentResponse>(`/tournaments/${tournamentId}`);
      setLiveTournament(response.data);
      setLiveTournamentNameDraft(response.data.config.name);
      setIsEditingCompletedTournament(editMode);
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
      setLiveTournamentNameDraft(response.data.config.name);
      if (!response.data.rounds.every((round) => round.matches.every((match) => match.completed))) {
        setIsEditingCompletedTournament(false);
      }
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
      setLiveTournamentNameDraft(response.data.config.name);
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

  const finishTournament = () => {
    if (!isTournamentCompleted) {
      setErrorText("Finish is only available after all round matches have scores.");
      return;
    }
    setIsEditingCompletedTournament(false);
    setStep("LEADERBOARD");
  };

  const saveTournamentName = async () => {
    if (!liveTournament) {
      return;
    }
    const newName = liveTournamentNameDraft.trim();
    if (newName.length < 2) {
      setErrorText("Tournament name must be at least 2 characters.");
      return;
    }
    try {
      setErrorText("");
      const response = await apiPost<TournamentResponse>("/tournaments/rename", {
        tournamentId: liveTournament.id,
        newName
      });
      setLiveTournament(response.data);
      setLiveTournamentNameDraft(response.data.config.name);
      setTournaments((previous) => previous.map((item) => (item.id === response.data.id ? response.data : item)));
    } catch (error) {
      setErrorText((error as Error).message);
    }
  };

  const openTournamentOptions = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setPendingTournamentAction(null);
    setShowTournamentOptionsModal(true);
  };

  const requestTournamentAction = (action: "EDIT" | "DELETE") => {
    setPendingTournamentAction(action);
    setShowTournamentOptionsModal(false);
    setShowTournamentActionConfirmModal(true);
  };

  const confirmTournamentAction = async () => {
    if (!selectedTournamentId || !pendingTournamentAction) {
      setShowTournamentActionConfirmModal(false);
      return;
    }
    try {
      setErrorText("");
      if (pendingTournamentAction === "DELETE") {
        await apiDelete<{ ok: boolean }>(`/tournaments/${selectedTournamentId}`);
        setTournaments((previous) => previous.filter((item) => item.id !== selectedTournamentId));
        if (liveTournament?.id === selectedTournamentId) {
          setLiveTournament(null);
          setStep("LIST");
        }
      } else {
        await openTournament(selectedTournamentId, true);
      }
    } catch (error) {
      setErrorText((error as Error).message);
    } finally {
      setShowTournamentActionConfirmModal(false);
      setPendingTournamentAction(null);
      setSelectedTournamentId(null);
    }
  };

  if (step === "LIST") {
    return (
      <>
        <TournamentListView
          tournaments={tournaments}
          refreshing={listRefreshing}
          errorText={errorText}
          onRefresh={() => void loadTournaments()}
          onCreateNew={() => setStep("NAME")}
          onOpenTournament={(id) => void openTournament(id)}
          onOpenOptions={openTournamentOptions}
        />
        <Modal transparent visible={showTournamentOptionsModal} animationType="fade" onRequestClose={() => setShowTournamentOptionsModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <View style={{ backgroundColor: "white", width: "100%", maxWidth: 420, padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>Tournament Options</Text>
              <Button title="Edit Tournament" onPress={() => requestTournamentAction("EDIT")} />
              <Button title="Delete Tournament" onPress={() => requestTournamentAction("DELETE")} />
              <Button title="Cancel" onPress={() => setShowTournamentOptionsModal(false)} />
            </View>
          </View>
        </Modal>
        <Modal
          transparent
          visible={showTournamentActionConfirmModal}
          animationType="fade"
          onRequestClose={() => setShowTournamentActionConfirmModal(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <View style={{ backgroundColor: "white", width: "100%", maxWidth: 420, padding: 16, gap: 12 }}>
              <Text style={{ fontSize: 18, fontWeight: "700" }}>
                {pendingTournamentAction === "DELETE" ? "Delete Tournament?" : "Edit Tournament?"}
              </Text>
              <Text>
                {pendingTournamentAction === "DELETE"
                  ? "Are you sure you want to delete this tournament?"
                  : "Are you sure you want to edit this tournament?"}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button title="Cancel" onPress={() => setShowTournamentActionConfirmModal(false)} />
                <Button title="Yes" onPress={() => void confirmTournamentAction()} />
              </View>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  if (step === "NAME") {
    return (
      <NameStepView
        name={name}
        canContinue={canContinueFromName}
        onChangeName={setName}
        onBack={() => setStep("LIST")}
        onNext={() => setStep("OPTIONS")}
      />
    );
  }

  if (step === "OPTIONS") {
    return (
      <TournamentOptionsStepView
        mode={mode}
        variant={variant}
        schedulingMode={effectiveSchedulingMode}
        onChangeMode={setMode}
        onChangeVariant={setVariant}
        onChangeSchedulingMode={setSchedulingMode}
        onBack={() => setStep("NAME")}
        onNext={() => setStep("PLAYERS")}
      />
    );
  }

  if (step === "PLAYERS") {
    return (
      <PlayersStepView
        players={players}
        genders={playerGenders}
        variant={variant}
        sanitizedPlayers={sanitizedPlayers}
        canContinue={canContinueFromPlayers}
        onUpdatePlayer={updatePlayerName}
        onUpdateGender={updatePlayerGender}
        onRemovePlayer={removePlayerInput}
        onAddPlayer={addPlayerInput}
        onBack={() => setStep("OPTIONS")}
        onNext={() => setStep("SETTINGS")}
      />
    );
  }

  if (step === "LIVE" && liveTournament) {
    return (
      <LiveTournamentView
        tournament={liveTournament}
        viewerBaseUrl={viewerBaseUrl}
        errorText={errorText}
        activeRound={activeRound}
        isLastRound={isLastRound}
        isTournamentCompleted={isTournamentCompleted}
        isEditingCompletedTournament={isEditingCompletedTournament}
        tournamentNameDraft={liveTournamentNameDraft}
        onChangeTournamentName={setLiveTournamentNameDraft}
        onSaveTournamentName={() => void saveTournamentName()}
        scoreInputs={scoreInputs}
        playerNameById={playerNameById}
        showEditConfirmModal={showEditConfirmModal}
        onBackToList={() => setStep("LIST")}
        onViewLeaderboard={() => setStep("LEADERBOARD")}
        onRefresh={() => void refreshTournament()}
        onFinishTournament={finishTournament}
        onOpenEditConfirm={() => setShowEditConfirmModal(true)}
        onCloseEditConfirm={() => setShowEditConfirmModal(false)}
        onConfirmEditGame={() => {
          setShowEditConfirmModal(false);
          setIsEditingCompletedTournament(true);
        }}
        onSaveGameEdits={() => setIsEditingCompletedTournament(false)}
        onUpdateScoreInput={updateScoreInput}
        onSubmitMatchScore={(matchId) => void submitMatchScore(matchId)}
      />
    );
  }

  if (step === "LEADERBOARD" && liveTournament) {
    return (
      <LeaderboardView
        tournament={liveTournament}
        rows={leaderboardRows}
        onBack={() => setStep("LIVE")}
        onOpenPlayer={(playerId) => {
          setSelectedPlayerId(playerId);
          setStep("PLAYER_GAMES");
        }}
      />
    );
  }

  if (step === "PLAYER_GAMES" && selectedPlayerId) {
    const playerName = playerNameById.get(selectedPlayerId) ?? selectedPlayerId;
    return <PlayerGamesView playerName={playerName} games={selectedPlayerGames} onBack={() => setStep("LEADERBOARD")} />;
  }

  return (
    <MatchSettingsStepView
      schedulingMode={effectiveSchedulingMode}
      courtsText={courtsText}
      pointsText={pointsText}
      targetGamesText={targetGamesText}
      tournamentTimeText={tournamentTimeText}
      estimate={estimate}
      responseText={responseText}
      errorText={errorText}
      onChangeCourts={setCourtsText}
      onChangePoints={setPointsText}
      onChangeTargetGames={setTargetGamesText}
      onChangeTournamentTime={setTournamentTimeText}
      onBack={() => setStep("PLAYERS")}
      onCreate={() => void createTournament()}
    />
  );
}
