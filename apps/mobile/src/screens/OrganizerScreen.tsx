import { useMemo, useState } from "react";
import type { TournamentMode, TournamentVariant } from "@padel/shared";

import { apiGet, apiPost } from "../api/client";
import { LeaderboardView } from "./organizer/LeaderboardView";
import { LiveTournamentView } from "./organizer/LiveTournamentView";
import { NameStepView } from "./organizer/NameStepView";
import { PlayerGamesView } from "./organizer/PlayerGamesView";
import { PlayersStepView } from "./organizer/PlayersStepView";
import { RulesStepView } from "./organizer/RulesStepView";
import { TournamentListView } from "./organizer/TournamentListView";
import type { CreateTournamentResponse, SetupStep, TournamentListResponse, TournamentResponse } from "./organizer/types";
import { buildLeaderboardRows, buildPlayerGameRows, computeEstimate } from "./organizer/utils";

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
  const [liveTournament, setLiveTournament] = useState<TournamentResponse["data"] | null>(null);
  const [tournaments, setTournaments] = useState<TournamentListResponse["data"]>([]);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { scoreA: string; scoreB: string }>>({});
  const [isEditingCompletedTournament, setIsEditingCompletedTournament] = useState(false);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);

  const viewerBaseUrl = process.env.EXPO_PUBLIC_VIEWER_BASE_URL ?? "http://localhost:3000";

  const sanitizedPlayers = useMemo(() => players.map((value) => value.trim()).filter(Boolean), [players]);

  const estimate = useMemo(
    () =>
      computeEstimate({
        courtsText,
        pointsText,
        mode,
        targetGamesText,
        tournamentTimeText,
        playersCount: sanitizedPlayers.length
      }),
    [courtsText, mode, pointsText, sanitizedPlayers.length, targetGamesText, tournamentTimeText]
  );

  const canContinueFromName = name.trim().length >= 2;
  const canContinueFromPlayers = sanitizedPlayers.length >= 4;

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

  const addPlayerInput = () => setPlayers((previous) => [...previous, ""]);
  const removePlayerInput = (index: number) => setPlayers((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
  const updatePlayerName = (index: number, value: string) =>
    setPlayers((previous) => previous.map((item, itemIndex) => (itemIndex === index ? value : item)));

  const createTournament = async () => {
    try {
      setErrorText("");
      const payload = {
        name: name.trim(),
        mode,
        variant,
        players: sanitizedPlayers,
        courts: Number(courtsText),
        pointsPerMatch: Number(pointsText),
        targetGamesPerPlayer: mode === "AMERICANO" ? Number(targetGamesText) : undefined,
        tournamentTimeMinutes: mode === "MEXICANO" ? Number(tournamentTimeText) : undefined
      };
      const response = await apiPost<CreateTournamentResponse>("/tournaments", payload);
      setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
      setLiveTournament(response.data);
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

  const openTournament = async (tournamentId: string) => {
    try {
      setErrorText("");
      const response = await apiGet<TournamentResponse>(`/tournaments/${tournamentId}`);
      setLiveTournament(response.data);
      setIsEditingCompletedTournament(false);
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

  if (step === "LIST") {
    return (
      <TournamentListView
        tournaments={tournaments}
        refreshing={listRefreshing}
        errorText={errorText}
        onRefresh={() => void loadTournaments()}
        onCreateNew={() => setStep("NAME")}
        onOpenTournament={(id) => void openTournament(id)}
      />
    );
  }

  if (step === "NAME") {
    return (
      <NameStepView
        name={name}
        canContinue={canContinueFromName}
        onChangeName={setName}
        onBack={() => setStep("LIST")}
        onNext={() => setStep("PLAYERS")}
      />
    );
  }

  if (step === "PLAYERS") {
    return (
      <PlayersStepView
        players={players}
        sanitizedPlayers={sanitizedPlayers}
        canContinue={canContinueFromPlayers}
        onUpdatePlayer={updatePlayerName}
        onRemovePlayer={removePlayerInput}
        onAddPlayer={addPlayerInput}
        onBack={() => setStep("NAME")}
        onNext={() => setStep("RULES")}
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
    <RulesStepView
      mode={mode}
      variant={variant}
      courtsText={courtsText}
      pointsText={pointsText}
      targetGamesText={targetGamesText}
      tournamentTimeText={tournamentTimeText}
      estimate={estimate}
      responseText={responseText}
      errorText={errorText}
      onChangeMode={setMode}
      onChangeVariant={setVariant}
      onChangeCourts={setCourtsText}
      onChangePoints={setPointsText}
      onChangeTargetGames={setTargetGamesText}
      onChangeTournamentTime={setTournamentTimeText}
      onBack={() => setStep("PLAYERS")}
      onCreate={() => void createTournament()}
    />
  );
}
