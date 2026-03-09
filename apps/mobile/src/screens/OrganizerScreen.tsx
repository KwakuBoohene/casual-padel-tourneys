import { useMemo, useState } from "react";
import { Button, Modal, Text, View } from "react-native";
import type { PlayerGender, SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { apiDelete, apiGet, apiPost } from "../api/client";
import { GameEstimatorView } from "./organizer/GameEstimatorView";
import { LeaderboardView } from "./organizer/LeaderboardView";
import { LiveTournamentView } from "./organizer/LiveTournamentView";
import { MatchSettingsStepView } from "./organizer/MatchSettingsStepView";
import { NameStepView } from "./organizer/NameStepView";
import { PlayerGamesView } from "./organizer/PlayerGamesView";
import { PlayersStepView } from "./organizer/PlayersStepView";
import { TournamentListView } from "./organizer/TournamentListView";
import { TournamentOptionsStepView } from "./organizer/TournamentOptionsStepView";
import type { CreateTournamentResponse, SetupStep, TournamentListResponse, TournamentResponse } from "./organizer/types";
import { buildLeaderboardRows, buildPlayerGameRows, computeEstimate, computeLiveTimeStatus } from "./organizer/utils";

export function OrganizerScreen() {
  const sanitizeWholeNumberInput = (value: string) => value.replace(/[^0-9]/g, "");
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
  const [showLiveOptionsModal, setShowLiveOptionsModal] = useState(false);
  const [showAdjustCourtsConfirmModal, setShowAdjustCourtsConfirmModal] = useState(false);
  const [scorePicker, setScorePicker] = useState<{ matchId: string; side: "scoreA" | "scoreB" } | null>(null);
  const [suppressNextScorePickerOpen, setSuppressNextScorePickerOpen] = useState<{ matchId: string; side: "scoreA" | "scoreB" } | null>(null);
  const [focusSubmitMatchId, setFocusSubmitMatchId] = useState<string | null>(null);
  const [proposedCourts, setProposedCourts] = useState(2);
  const [estimatorMode, setEstimatorMode] = useState<TournamentMode>("AMERICANO");
  const [estimatorVariant, setEstimatorVariant] = useState<TournamentVariant>("CLASSIC");
  const [estimatorSchedulingMode, setEstimatorSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [estimatorUsersText, setEstimatorUsersText] = useState("8");
  const [estimatorCourtsText, setEstimatorCourtsText] = useState("2");
  const [estimatorPointsText, setEstimatorPointsText] = useState("24");
  const [estimatorTargetGamesText, setEstimatorTargetGamesText] = useState("4");
  const [estimatorTournamentTimeText, setEstimatorTournamentTimeText] = useState("90");

  const viewerBaseUrl = process.env.EXPO_PUBLIC_VIEWER_BASE_URL ?? "http://localhost:3000";
  const effectiveSchedulingMode: SchedulingMode = mode === "MEXICANO" ? "TOTAL_TIME" : schedulingMode;
  const effectiveEstimatorSchedulingMode: SchedulingMode = estimatorMode === "MEXICANO" ? "TOTAL_TIME" : estimatorSchedulingMode;

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
  const estimatorUsers = Number(estimatorUsersText);
  const estimator = useMemo(
    () =>
      computeEstimate({
        courtsText: estimatorCourtsText,
        pointsText: estimatorPointsText,
        mode: estimatorMode,
        schedulingMode: effectiveEstimatorSchedulingMode,
        targetGamesText: estimatorTargetGamesText,
        tournamentTimeText: estimatorTournamentTimeText,
        playersCount: Number.isFinite(estimatorUsers) ? estimatorUsers : 0
      }),
    [
      effectiveEstimatorSchedulingMode,
      estimatorCourtsText,
      estimatorMode,
      estimatorPointsText,
      estimatorTargetGamesText,
      estimatorTournamentTimeText,
      estimatorUsers
    ]
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
  const liveTimeStatus = useMemo(
    () => (liveTournament ? computeLiveTimeStatus(liveTournament) : { roundsLeft: 0, estimatedMinutesLeft: 0 }),
    [liveTournament]
  );
  const maxCourts = useMemo(() => {
    if (!liveTournament) {
      return 1;
    }
    return Math.max(1, Math.floor(liveTournament.players.length / 4));
  }, [liveTournament]);
  const canAdjustCourts = useMemo(() => {
    if (!liveTournament || isTournamentCompleted) {
      return false;
    }
    return liveTournament.config.courts > 1 || maxCourts > liveTournament.config.courts;
  }, [isTournamentCompleted, liveTournament, maxCourts]);

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

  const onChangeCourtsValue = (value: string) => setCourtsText(sanitizeWholeNumberInput(value));
  const onChangePointsValue = (value: string) => setPointsText(sanitizeWholeNumberInput(value));
  const onChangeTargetGamesValue = (value: string) => setTargetGamesText(sanitizeWholeNumberInput(value));
  const onChangeTournamentTimeValue = (value: string) => setTournamentTimeText(sanitizeWholeNumberInput(value));
  const onChangeEstimatorUsersValue = (value: string) => setEstimatorUsersText(sanitizeWholeNumberInput(value));
  const onChangeEstimatorCourtsValue = (value: string) => setEstimatorCourtsText(sanitizeWholeNumberInput(value));
  const onChangeEstimatorPointsValue = (value: string) => setEstimatorPointsText(sanitizeWholeNumberInput(value));
  const onChangeEstimatorTargetGamesValue = (value: string) => setEstimatorTargetGamesText(sanitizeWholeNumberInput(value));
  const onChangeEstimatorTournamentTimeValue = (value: string) => setEstimatorTournamentTimeText(sanitizeWholeNumberInput(value));

  const createTournament = async () => {
    try {
      setErrorText("");
      const courts = Number(courtsText);
      const pointsPerMatch = Number(pointsText);
      const targetGames = Number(targetGamesText);
      const tournamentTime = Number(tournamentTimeText);
      if (!Number.isInteger(courts) || courts < 1) {
        setErrorText("Courts must be a whole number greater than 0.");
        return;
      }
      if (!Number.isInteger(pointsPerMatch) || pointsPerMatch < 1) {
        setErrorText("Points per match must be a whole number greater than 0.");
        return;
      }
      if (effectiveSchedulingMode === "TARGET_GAMES" && (!Number.isInteger(targetGames) || targetGames < 1)) {
        setErrorText("Target games must be a whole number greater than 0.");
        return;
      }
      if (effectiveSchedulingMode === "TOTAL_TIME" && (!Number.isInteger(tournamentTime) || tournamentTime < 10)) {
        setErrorText("Tournament time must be a whole number of at least 10 minutes.");
        return;
      }
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
        courts,
        pointsPerMatch,
        targetGamesPerPlayer: effectiveSchedulingMode === "TARGET_GAMES" ? targetGames : undefined,
        tournamentTimeMinutes: effectiveSchedulingMode === "TOTAL_TIME" ? tournamentTime : undefined
      };
      const response = await apiPost<CreateTournamentResponse>("/tournaments", payload);
      setResponseText(`Created ${response.data.id}\nShare token: ${response.data.publicToken}`);
      setLiveTournament(response.data);
      setProposedCourts(
        Math.min(Math.max(1, response.data.config.courts), Math.max(1, Math.floor(response.data.players.length / 4)))
      );
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
      setProposedCourts(
        Math.min(Math.max(1, response.data.config.courts), Math.max(1, Math.floor(response.data.players.length / 4)))
      );
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
      setProposedCourts((previous) => {
        const nextMax = Math.max(1, Math.floor(response.data.players.length / 4));
        return Math.min(Math.max(1, previous), nextMax);
      });
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

  const getExistingMatch = (matchId: string) => {
    if (!liveTournament) {
      return undefined;
    }
    for (const round of liveTournament.rounds) {
      const found = round.matches.find((match) => match.id === matchId);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  const pickScoreFromSheet = (value: number) => {
    if (!liveTournament || !scorePicker) {
      return;
    }
    const { matchId, side } = scorePicker;
    const oppositeSide = side === "scoreA" ? "scoreB" : "scoreA";
    const match = getExistingMatch(matchId);
    const existing = scoreInputs[matchId];
    const currentA = existing?.scoreA ?? (match?.scoreA !== undefined ? String(match.scoreA) : "");
    const currentB = existing?.scoreB ?? (match?.scoreB !== undefined ? String(match.scoreB) : "");
    const bothFilledBefore = currentA.trim().length > 0 && currentB.trim().length > 0;
    const oppositeCurrent = oppositeSide === "scoreA" ? currentA : currentB;
    const totalScore = liveTournament.config.pointsPerMatch;
    const inferredOpposite = String(Math.max(0, totalScore - value));

    setScoreInputs((previous) => {
      const next = {
        scoreA: previous[matchId]?.scoreA ?? (match?.scoreA !== undefined ? String(match.scoreA) : ""),
        scoreB: previous[matchId]?.scoreB ?? (match?.scoreB !== undefined ? String(match.scoreB) : "")
      };
      next[side] = String(value);
      if (!bothFilledBefore && oppositeCurrent.trim().length === 0) {
        next[oppositeSide] = inferredOpposite;
      }
      return {
        ...previous,
        [matchId]: next
      };
    });
    setSuppressNextScorePickerOpen(scorePicker);
    setFocusSubmitMatchId(matchId);
    setScorePicker(null);
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

  const adjustTournamentCourts = async () => {
    if (!liveTournament) {
      return;
    }
    try {
      setErrorText("");
      const response = await apiPost<TournamentResponse>("/tournaments/adjust-courts", {
        tournamentId: liveTournament.id,
        courts: proposedCourts,
        expectedVersion: liveTournament.version
      });
      setLiveTournament(response.data);
      setProposedCourts((previous) => {
        const nextMax = Math.max(1, Math.floor(response.data.players.length / 4));
        return Math.min(Math.max(1, previous), nextMax);
      });
      setShowLiveOptionsModal(false);
      setShowAdjustCourtsConfirmModal(false);
    } catch (error) {
      setErrorText((error as Error).message);
      setShowAdjustCourtsConfirmModal(false);
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
          onOpenEstimator={() => setStep("ESTIMATOR")}
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

  if (step === "ESTIMATOR") {
    return (
      <GameEstimatorView
        mode={estimatorMode}
        variant={estimatorVariant}
        schedulingMode={effectiveEstimatorSchedulingMode}
        usersText={estimatorUsersText}
        courtsText={estimatorCourtsText}
        pointsText={estimatorPointsText}
        targetGamesText={estimatorTargetGamesText}
        tournamentTimeText={estimatorTournamentTimeText}
        estimate={estimator}
        onChangeMode={setEstimatorMode}
        onChangeVariant={setEstimatorVariant}
        onChangeSchedulingMode={setEstimatorSchedulingMode}
        onChangeUsers={onChangeEstimatorUsersValue}
        onChangeCourts={onChangeEstimatorCourtsValue}
        onChangePoints={onChangeEstimatorPointsValue}
        onChangeTargetGames={onChangeEstimatorTargetGamesValue}
        onChangeTournamentTime={onChangeEstimatorTournamentTimeValue}
        onBack={() => setStep("LIST")}
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
        showLiveOptionsModal={showLiveOptionsModal}
        showAdjustCourtsConfirmModal={showAdjustCourtsConfirmModal}
        tournamentNameDraft={liveTournamentNameDraft}
        roundsLeft={liveTimeStatus.roundsLeft}
        estimatedMinutesLeft={liveTimeStatus.estimatedMinutesLeft}
        currentCourts={liveTournament.config.courts}
        proposedCourts={proposedCourts}
        maxCourts={maxCourts}
        canAdjustCourts={canAdjustCourts}
        scorePicker={scorePicker}
        focusSubmitMatchId={focusSubmitMatchId}
        onChangeTournamentName={setLiveTournamentNameDraft}
        onChangeProposedCourts={setProposedCourts}
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
        onOpenLiveOptions={() => setShowLiveOptionsModal(true)}
        onCloseLiveOptions={() => setShowLiveOptionsModal(false)}
        onOpenAdjustCourtsConfirm={() => {
          setShowLiveOptionsModal(false);
          setShowAdjustCourtsConfirmModal(true);
        }}
        onCloseAdjustCourtsConfirm={() => setShowAdjustCourtsConfirmModal(false)}
        onConfirmAdjustCourts={() => void adjustTournamentCourts()}
        onSaveGameEdits={() => setIsEditingCompletedTournament(false)}
        onOpenScorePicker={(matchId, side) => {
          if (suppressNextScorePickerOpen?.matchId === matchId && suppressNextScorePickerOpen.side === side) {
            setSuppressNextScorePickerOpen(null);
            return;
          }
          setScorePicker({ matchId, side });
        }}
        onCloseScorePicker={() => setScorePicker(null)}
        onSelectScoreFromPicker={pickScoreFromSheet}
        onSubmitFocusHandled={() => setFocusSubmitMatchId(null)}
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
      onChangeCourts={onChangeCourtsValue}
      onChangePoints={onChangePointsValue}
      onChangeTargetGames={onChangeTargetGamesValue}
      onChangeTournamentTime={onChangeTournamentTimeValue}
      onBack={() => setStep("PLAYERS")}
      onCreate={() => void createTournament()}
    />
  );
}
