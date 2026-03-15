import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import type { PlayerGender, SchedulingMode, TournamentMode, TournamentVariant } from "@padel/shared";

import { apiDelete, apiGet, apiPost, setAuthToken } from "../../../api/client";
import { logger } from "../../../logger";
import type { CreateTournamentResponse, SetupStep, TournamentListResponse, TournamentResponse } from "../types";
import { buildLeaderboardRows, buildPlayerGameRows, computeEstimate, computeLiveTimeStatus } from "../utils";

const sanitizeWholeNumberInput = (value: string) => value.replace(/[^0-9]/g, "");

export function useOrganizerScreen() {
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; email: string; avatarUrl?: string } | null>(null);
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
  const [suppressNextScorePickerOpen, setSuppressNextScorePickerOpen] = useState<{ matchId: string; side: "scoreA" | "scoreB" } | null>(
    null
  );
  const [focusSubmitMatchId, setFocusSubmitMatchId] = useState<string | null>(null);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);
  const [proposedCourts, setProposedCourts] = useState(2);
  const [estimatorMode, setEstimatorMode] = useState<TournamentMode>("AMERICANO");
  const [estimatorVariant, setEstimatorVariant] = useState<TournamentVariant>("CLASSIC");
  const [estimatorSchedulingMode, setEstimatorSchedulingMode] = useState<SchedulingMode>("TARGET_GAMES");
  const [estimatorUsersText, setEstimatorUsersText] = useState("8");
  const [estimatorCourtsText, setEstimatorCourtsText] = useState("2");
  const [estimatorPointsText, setEstimatorPointsText] = useState("24");
  const [estimatorTargetGamesText, setEstimatorTargetGamesText] = useState("4");
  const [estimatorTournamentTimeText, setEstimatorTournamentTimeText] = useState("90");
  const [suggestedPlayerNames, setSuggestedPlayerNames] = useState<string[]>([]);

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
  const hasDuplicatePlayerNames = useMemo(() => {
    const filled = players.map((p) => p.trim()).filter(Boolean);
    return new Set(filled.map((s) => s.toLowerCase())).size !== filled.length;
  }, [players]);

  const canContinueFromPlayers = useMemo(() => {
    if (sanitizedPlayers.length < 4) {
      return false;
    }
    if (hasDuplicatePlayerNames) {
      return false;
    }
    if (variant !== "MIXED") {
      return true;
    }
    return players.every((value, index) => value.trim().length === 0 || Boolean(playerGenders[index]));
  }, [hasDuplicatePlayerNames, playerGenders, players, sanitizedPlayers.length, variant]);

  const playerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const player of liveTournament?.players ?? []) {
      map.set(player.id, player.name);
    }
    return map;
  }, [liveTournament?.players]);

  const sortedRounds = useMemo(() => {
    if (!liveTournament) return [];
    return [...liveTournament.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  }, [liveTournament]);

  const activeRound = useMemo(() => {
    if (!liveTournament) {
      return null;
    }
    return (
      liveTournament.rounds.find((round) => !round.isLocked) ??
      sortedRounds[sortedRounds.length - 1] ??
      null
    );
  }, [liveTournament, sortedRounds]);

  const displayedRound = useMemo(() => sortedRounds[selectedRoundIndex] ?? null, [sortedRounds, selectedRoundIndex]);

  useEffect(() => {
    if (!liveTournament || !activeRound) return;
    const idx = sortedRounds.findIndex((r) => r.id === activeRound.id);
    if (idx >= 0) setSelectedRoundIndex(idx);
  }, [liveTournament?.id, activeRound?.id, sortedRounds]);

  const goToPrevRound = () => setSelectedRoundIndex((i) => Math.max(0, i - 1));
  const goToNextRound = () => setSelectedRoundIndex((i) => Math.min(sortedRounds.length - 1, i + 1));

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

  const selectSuggestion = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const emptyIndex = players.findIndex((p) => p.trim() === "");
    if (emptyIndex >= 0) {
      setPlayers((previous) => {
        const next = [...previous];
        next[emptyIndex] = trimmed;
        return next;
      });
    } else {
      setPlayers((previous) => [...previous, trimmed]);
      setPlayerGenders((previous) => [...previous, undefined]);
    }
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
  const allKnownPlayerNames = useMemo(() => {
    const names = new Set<string>();
    for (const suggestion of suggestedPlayerNames) {
      if (suggestion.trim().length > 0) {
        names.add(suggestion.trim());
      }
    }
    for (const tournament of tournaments) {
      for (const player of tournament.players) {
        if (player.name.trim().length > 0) {
          names.add(player.name.trim());
        }
      }
    }
    for (const playerName of players) {
      const trimmed = playerName.trim();
      if (trimmed.length > 0) {
        names.add(trimmed);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [players, suggestedPlayerNames, tournaments]);

  const loadPlayerSuggestions = async () => {
    try {
      const response = await apiGet<{ names: string[] }>("/players/suggestions");
      setSuggestedPlayerNames(response.names ?? []);
    } catch {
      // Ignore suggestion errors; autocomplete will fall back to local names.
    }
  };

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
      if (sanitizedPlayers.length < courts * 4) {
        setErrorText(`${courts} court${courts === 1 ? "" : "s"} require at least ${courts * 4} players.`);
        return;
      }
      if (hasDuplicatePlayerNames) {
        setErrorText("No two players can have the same name.");
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
      await loadPlayerSuggestions();
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

  const submitRoundScores = async () => {
    if (!liveTournament || !displayedRound) return;
    const matchesWithScores = displayedRound.matches.filter((match) => {
      const raw = scoreInputs[match.id];
      const scoreA = Number(raw?.scoreA ?? "");
      const scoreB = Number(raw?.scoreB ?? "");
      return Number.isFinite(scoreA) && Number.isFinite(scoreB);
    });
    if (matchesWithScores.length === 0) {
      setErrorText("Enter valid numeric scores for at least one match in this round.");
      return;
    }
    let version = liveTournament.version;
    setErrorText("");
    for (const match of matchesWithScores) {
      const raw = scoreInputs[match.id]!;
      const scoreA = Number(raw.scoreA);
      const scoreB = Number(raw.scoreB);
      try {
        const response = await apiPost<TournamentResponse>("/tournaments/score", {
          tournamentId: liveTournament.id,
          matchId: match.id,
          scoreA,
          scoreB,
          expectedVersion: version
        });
        setLiveTournament(response.data);
        setLiveTournamentNameDraft(response.data.config.name);
        version = response.data.version;
      } catch (error) {
        setErrorText((error as Error).message);
        return;
      }
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

  const clearScoreForMatch = (matchId: string) => {
    setScoreInputs((previous) => {
      const next = { ...previous };
      next[matchId] = { scoreA: "", scoreB: "" };
      return next;
    });
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
    if (liveTournament) {
      setTournaments((previous) => previous.map((item) => (item.id === liveTournament.id ? liveTournament : item)));
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

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        logger.debug("bootstrapAuth: starting", { platform: Platform.OS });
        let storedToken: string | null = null;
        let storedUser: string | null = null;

        if (Platform.OS === "web") {
          const anyGlobal = globalThis as typeof globalThis & { localStorage?: { getItem(key: string): string | null } };
          if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
            storedToken = anyGlobal.localStorage.getItem("authToken");
            storedUser = anyGlobal.localStorage.getItem("authUser");
          }
        } else {
          storedToken = await SecureStore.getItemAsync("authToken");
          storedUser = await SecureStore.getItemAsync("authUser");
        }

        logger.debug("bootstrapAuth: loaded from storage", {
          hasToken: Boolean(storedToken),
          hasUser: Boolean(storedUser)
        });

        if (storedToken) {
          setAuthTokenState(storedToken);
          setAuthToken(storedToken);
        }
        if (storedUser) {
          try {
            setCurrentUser(JSON.parse(storedUser));
          } catch (error) {
            logger.warn("bootstrapAuth: failed to parse stored user", { error });
          }
        }
      } catch (error) {
        logger.error("bootstrapAuth: error while restoring auth state", { error });
      }
    };
    void bootstrapAuth();
  }, []);

  useEffect(() => {
    if (!authToken) {
      return;
    }
    void loadTournaments();
  }, [authToken]);

  const handleSignedIn = async (payload: {
    token: string;
    user: { id: string; name?: string; email: string; avatarUrl?: string };
  }) => {
    logger.info("handleSignedIn: storing auth state", { platform: Platform.OS, userId: payload.user.id });
    setAuthTokenState(payload.token);
    setAuthToken(payload.token);
    setCurrentUser(payload.user);

    try {
      if (Platform.OS === "web") {
        const anyGlobal = globalThis as typeof globalThis & { localStorage?: { setItem(key: string, value: string): void } };
        if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
          anyGlobal.localStorage.setItem("authToken", payload.token);
          anyGlobal.localStorage.setItem("authUser", JSON.stringify(payload.user));
        }
      } else {
        await SecureStore.setItemAsync("authToken", payload.token);
        await SecureStore.setItemAsync("authUser", JSON.stringify(payload.user));
      }
    } catch (error) {
      logger.error("handleSignedIn: failed to persist auth state", { error });
    }

    void loadTournaments();
  };

  const handleSignOut = async () => {
    logger.info("handleSignOut: clearing auth state", { platform: Platform.OS, currentUserId: currentUser?.id });
    setAuthTokenState(null);
    setAuthToken(null);
    setCurrentUser(null);
    setTournaments([]);
    setLiveTournament(null);

    try {
      if (Platform.OS === "web") {
        const anyGlobal = globalThis as typeof globalThis & { localStorage?: { removeItem(key: string): void } };
        if (typeof anyGlobal !== "undefined" && anyGlobal.localStorage) {
          anyGlobal.localStorage.removeItem("authToken");
          anyGlobal.localStorage.removeItem("authUser");
        }
      } else {
        await SecureStore.deleteItemAsync("authToken");
        await SecureStore.deleteItemAsync("authUser");
      }
    } catch (error) {
      logger.error("handleSignOut: failed to clear stored auth", { error });
    }

    setStep("LIST");
  };

  return {
    // auth
    authToken,
    currentUser,
    handleSignedIn,
    handleSignOut,
    // navigation
    step,
    setStep,
    // create tournament
    name,
    setName,
    canContinueFromName,
    mode,
    setMode,
    variant,
    setVariant,
    schedulingMode,
    setSchedulingMode,
    effectiveSchedulingMode,
    players,
    playerGenders,
    sanitizedPlayers,
    canContinueFromPlayers,
    hasDuplicatePlayerNames,
    allKnownPlayerNames,
    addPlayerInput,
    removePlayerInput,
    selectSuggestion,
    updatePlayerName,
    updatePlayerGender,
    courtsText,
    pointsText,
    targetGamesText,
    tournamentTimeText,
    estimate,
    onChangeCourtsValue,
    onChangePointsValue,
    onChangeTargetGamesValue,
    onChangeTournamentTimeValue,
    responseText,
    createTournament,
    // estimator
    estimatorMode,
    setEstimatorMode,
    estimatorVariant,
    setEstimatorVariant,
    estimatorSchedulingMode,
    setEstimatorSchedulingMode,
    effectiveEstimatorSchedulingMode,
    estimatorUsersText,
    estimatorCourtsText,
    estimatorPointsText,
    estimatorTargetGamesText,
    estimatorTournamentTimeText,
    estimator,
    onChangeEstimatorUsersValue,
    onChangeEstimatorCourtsValue,
    onChangeEstimatorPointsValue,
    onChangeEstimatorTargetGamesValue,
    onChangeEstimatorTournamentTimeValue,
    // tournaments list
    tournaments,
    listRefreshing,
    errorText,
    loadTournaments,
    openTournamentOptions,
    requestTournamentAction,
    confirmTournamentAction,
    showTournamentOptionsModal,
    setShowTournamentOptionsModal,
    showTournamentActionConfirmModal,
    setShowTournamentActionConfirmModal,
    pendingTournamentAction,
    openTournament,
    // live tournament
    liveTournament,
    liveTournamentNameDraft,
    setLiveTournamentNameDraft,
    saveTournamentName,
    activeRound,
    displayedRound,
    sortedRounds,
    selectedRoundIndex,
    goToPrevRound,
    goToNextRound,
    isLastRound,
    isTournamentCompleted,
    isEditingCompletedTournament,
    setIsEditingCompletedTournament,
    liveTimeStatus,
    maxCourts,
    canAdjustCourts,
    proposedCourts,
    setProposedCourts,
    showLiveOptionsModal,
    setShowLiveOptionsModal,
    showAdjustCourtsConfirmModal,
    setShowAdjustCourtsConfirmModal,
    adjustTournamentCourts,
    leaderboardRows,
    selectedPlayerId,
    setSelectedPlayerId,
    selectedPlayerGames,
    finishTournament,
    refreshTournament,
    // scoring
    scoreInputs,
    updateScoreInput,
    clearScoreForMatch,
    submitRoundScores,
    pickScoreFromSheet,
    scorePicker,
    setScorePicker,
    suppressNextScorePickerOpen,
    setSuppressNextScorePickerOpen,
    focusSubmitMatchId,
    setFocusSubmitMatchId,
    playerNameById,
    showEditConfirmModal,
    setShowEditConfirmModal,
    // misc
    viewerBaseUrl
  };
}

