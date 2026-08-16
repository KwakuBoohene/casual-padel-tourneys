import { router } from "expo-router";
import { KohScreen } from "../../screens/KohScreen";
import { useOrganizerScreen } from "../../hooks/organizer/useOrganizerScreen";
import { formatTournamentMode } from "../../utilities/organizer/formatLabels";

import { AccountPlayersFlow } from "../accountPlayers/AccountPlayersFlow";
import { KohLiveHub } from "../koh/live/KohLiveHub";
import { LeaderboardView } from "./leaderboard/LeaderboardView";
import { MatchSettingsStepView } from "./create/MatchSettingsStepView";
import { NameStepView } from "./create/NameStepView";
import { OrganizerLiveScreen } from "./live/OrganizerLiveScreen";
import { PlayerGamesView } from "./leaderboard/PlayerGamesView";
import { PlayersStepView } from "./create/PlayersStepView";
import { TeamPlayersStepView } from "./create/TeamPlayersStepView";
import { TournamentOptionsStepView } from "./create/TournamentOptionsStepView";

function backToList(setStep: (step: "LIST") => void): void {
  setStep("LIST");
  router.replace("/tournaments");
}

export function OrganizerSignedInBody({ org }: { org: ReturnType<typeof useOrganizerScreen> }) {
  const {
    currentUser,
    step,
    setStep,
    name,
    setName,
    canContinueFromName,
    mode,
    setMode,
    modeLockedFromList,
    cancelCreateToList,
    variant,
    setVariant,
    setSchedulingMode,
    effectiveSchedulingMode,
    players,
    playerGenders,
    teams,
    isTeamMexicano,
    sanitizedPlayers,
    minPlayers,
    minTeams,
    canContinueFromPlayers,
    allKnownPlayerNames,
    addPlayer,
    addTeam,
    updateTeam,
    removeTeam,
    updatePlayer,
    removePlayerInput,
    selectSuggestion,
    hasDuplicatePlayerNames,
    courtsText,
    pointsText,
    targetGamesText,
    tournamentTimeText,
    estimate,
    prepareSettingsForMode,
    onChangeCourtsValue,
    onChangePointsValue,
    onChangeTargetGamesValue,
    onChangeTournamentTimeValue,
    settingsPhase,
    setSettingsPhase,
    scoringMode,
    setScoringMode,
    setFormat,
    setSetFormat,
    gameWinBy,
    setGameWinBy,
    setsToWin,
    setSetsToWin,
    setTiebreakTo,
    setSetTiebreakTo,
    matchTiebreak,
    setMatchTiebreak,
    responseText,
    createTournament,
    errorText,
    loadTournaments,
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
    generateNextMexicanoRound,
    generatingNextRound,
    canGenerateNextRound,
    canFinishNight,
    refreshTournament,
    scoreInputs,
    updateScoreInput,
    submitRoundScores,
    scoreEntry,
    scoreEntryContextLine,
    scoreEntryCanComplete,
    scoreEntryPlusDisabledA,
    scoreEntryPlusDisabledB,
    requestOpenScoreEntry,
    closeScoreEntry,
    changeScoreA,
    changeScoreB,
    undoScoreEntry,
    saveScoreEntry,
    saveScoreDraft,
    savingScore,
    pendingCompletedEditMatchId,
    confirmEditCompletedScore,
    cancelEditCompletedScore,
    scoreSheetError,
    clearScoreSheetError,
    focusSubmitMatchId,
    setFocusSubmitMatchId,
    playerNameById,
    showEditConfirmModal,
    setShowEditConfirmModal,
    showAddPendingPlayerModal,
    pendingPlayerNameDraft,
    setPendingPlayerNameDraft,
    pendingPlayerGender,
    setPendingPlayerGender,
    showIntegrateConfirmModal,
    openAddPendingPlayerModal,
    closeAddPendingPlayerModal,
    submitAddPendingPlayer,
    openIntegrateConfirmModal,
    closeIntegrateConfirmModal,
    confirmIntegratePendingPlayers,
    renamePlayersVisible,
    renameDrafts,
    renameSaving,
    openRenamePlayers,
    closeRenamePlayers,
    changeRenameDraft,
    saveRenames,
    viewerBaseUrl,
    kohHub,
    adoptKohHub,
    clearKohHub,
    setKohHub,
    setErrorText,
    markEmailVerifyRequired
  } = org;

  const modeLabel = formatTournamentMode(mode);

  if (step === "LIST" || step === "ESTIMATOR" || step === "PROFILE" || step === "ATTACH") {
    // These live under Expo Router — bounce if we land here on /flow.
    backToList(setStep);
    return null;
  }

  if (step === "ACCOUNT_PLAYERS") {
    return (
      <AccountPlayersFlow
        isGuest={currentUser?.isGuest === true}
        errorText={errorText}
        setErrorText={setErrorText}
        markEmailVerifyRequired={markEmailVerifyRequired}
        onBack={() => backToList(setStep)}
        onAttach={() => router.push("/profile/attach")}
      />
    );
  }

  if (step === "KOH") {
    return (
      <KohScreen
        errorText={errorText}
        setErrorText={setErrorText}
        markEmailVerifyRequired={markEmailVerifyRequired}
        onCancel={() => backToList(setStep)}
        onStarted={(hub) => {
          adoptKohHub(hub);
          void loadTournaments();
          setStep("KOH_LIVE");
        }}
      />
    );
  }

  if (step === "KOH_LIVE" && kohHub) {
    return (
      <KohLiveHub
        hub={kohHub}
        setHub={setKohHub}
        errorText={errorText}
        setErrorText={setErrorText}
        markEmailVerifyRequired={markEmailVerifyRequired}
        viewerBaseUrl={viewerBaseUrl}
        onBackToList={() => {
          clearKohHub();
          backToList(setStep);
        }}
      />
    );
  }

  if (step === "NAME") {
    return (
      <NameStepView
        modeLabel={modeLabel}
        name={name}
        canContinue={canContinueFromName}
        onChangeName={setName}
        onBack={cancelCreateToList}
        onNext={() => setStep("OPTIONS")}
      />
    );
  }

  if (step === "OPTIONS") {
    return (
      <TournamentOptionsStepView
        mode={mode}
        modeLocked={modeLockedFromList}
        modeLabel={modeLabel}
        variant={variant}
        schedulingMode={effectiveSchedulingMode}
        onChangeMode={(value) => {
          setMode(value);
          if (value === "MEXICANO") setSchedulingMode("TOTAL_TIME");
          if (value !== "MEXICANO" && variant === "TEAM") setVariant("CLASSIC");
          prepareSettingsForMode(value);
        }}
        onChangeVariant={setVariant}
        onChangeSchedulingMode={setSchedulingMode}
        onBack={() => setStep("NAME")}
        onNext={() => setStep("PLAYERS")}
      />
    );
  }

  if (step === "PLAYERS") {
    if (isTeamMexicano) {
      return (
        <TeamPlayersStepView
          modeLabel={modeLabel}
          teams={teams}
          minTeams={minTeams}
          canContinue={canContinueFromPlayers}
          hasDuplicateNames={hasDuplicatePlayerNames}
          onAddTeam={addTeam}
          onUpdateTeam={updateTeam}
          onRemoveTeam={removeTeam}
          onBack={() => setStep("OPTIONS")}
          onNext={() => {
            const suggestedCourts = Math.max(1, Math.floor(sanitizedPlayers.length / 4) || 1);
            onChangeCourtsValue(String(suggestedCourts));
            prepareSettingsForMode("MEXICANO");
            setStep("SETTINGS");
          }}
        />
      );
    }
    return (
      <PlayersStepView
        modeLabel={modeLabel}
        players={players}
        genders={playerGenders}
        variant={variant}
        minPlayers={minPlayers}
        canContinue={canContinueFromPlayers}
        hasDuplicateNames={hasDuplicatePlayerNames}
        allSuggestions={allKnownPlayerNames}
        onAddPlayer={addPlayer}
        onUpdatePlayer={updatePlayer}
        onRemovePlayer={removePlayerInput}
        onSelectSuggestion={selectSuggestion}
        onBack={() => setStep("OPTIONS")}
        onNext={() => {
          const suggestedCourts = Math.max(1, Math.floor(sanitizedPlayers.length / 4) || 1);
          onChangeCourtsValue(String(suggestedCourts));
          if (mode === "MEXICANO") {
            prepareSettingsForMode("MEXICANO");
          }
          setStep("SETTINGS");
        }}
      />
    );
  }

  if (step === "LIVE" && liveTournament) {
    return (
      <OrganizerLiveScreen
        tournament={liveTournament}
        viewerBaseUrl={viewerBaseUrl}
        errorText={errorText}
        activeRound={activeRound}
        displayedRound={displayedRound}
        sortedRounds={sortedRounds}
        selectedRoundIndex={selectedRoundIndex}
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
        scoreEntry={scoreEntry}
        scoreEntryContextLine={scoreEntryContextLine}
        scoreEntryCanComplete={scoreEntryCanComplete}
        scoreEntryPlusDisabledA={scoreEntryPlusDisabledA}
        scoreEntryPlusDisabledB={scoreEntryPlusDisabledB}
        savingScore={savingScore}
        pendingCompletedEditMatchId={pendingCompletedEditMatchId}
        scoreSheetError={scoreSheetError}
        focusSubmitMatchId={focusSubmitMatchId}
        scoreInputs={scoreInputs}
        playerNameById={playerNameById}
        showEditConfirmModal={showEditConfirmModal}
        onBackToList={() => backToList(setStep)}
        onViewLeaderboard={() => setStep("LEADERBOARD")}
        onRefresh={() => void refreshTournament()}
        onFinishTournament={() => void finishTournament()}
        canGenerateNextRound={canGenerateNextRound}
        generatingNextRound={generatingNextRound}
        canFinishNight={canFinishNight}
        onGenerateNextRound={() => void generateNextMexicanoRound()}
        onChangeTournamentName={setLiveTournamentNameDraft}
        onChangeProposedCourts={setProposedCourts}
        onSaveTournamentName={() => void saveTournamentName()}
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
        onOpenScoreEntry={requestOpenScoreEntry}
        onCloseScoreEntry={closeScoreEntry}
        onChangeScoreA={changeScoreA}
        onChangeScoreB={changeScoreB}
        onUndoScoreEntry={undoScoreEntry}
        onSaveScoreEntry={() => void saveScoreEntry()}
        onSaveScoreDraft={() => void saveScoreDraft()}
        onConfirmEditCompletedScore={confirmEditCompletedScore}
        onCancelEditCompletedScore={cancelEditCompletedScore}
        onClearScoreSheetError={clearScoreSheetError}
        onSubmitFocusHandled={() => setFocusSubmitMatchId(null)}
        onUpdateScoreInput={updateScoreInput}
        onPrevRound={goToPrevRound}
        onNextRound={goToNextRound}
        onSubmitRoundScores={() => void submitRoundScores()}
        showAddPendingPlayerModal={showAddPendingPlayerModal}
        pendingPlayerNameDraft={pendingPlayerNameDraft}
        pendingPlayerGender={pendingPlayerGender}
        showIntegrateConfirmModal={showIntegrateConfirmModal}
        onOpenAddPendingPlayer={openAddPendingPlayerModal}
        onCloseAddPendingPlayer={closeAddPendingPlayerModal}
        onChangePendingPlayerName={setPendingPlayerNameDraft}
        onChangePendingPlayerGender={setPendingPlayerGender}
        onSubmitAddPendingPlayer={() => void submitAddPendingPlayer()}
        onOpenIntegrateConfirm={openIntegrateConfirmModal}
        onCloseIntegrateConfirm={closeIntegrateConfirmModal}
        onConfirmIntegratePendingPlayers={() => void confirmIntegratePendingPlayers()}
        renamePlayersVisible={renamePlayersVisible}
        renameDrafts={renameDrafts}
        renameSaving={renameSaving}
        onOpenRenamePlayers={openRenamePlayers}
        onCloseRenamePlayers={closeRenamePlayers}
        onChangeRenameDraft={changeRenameDraft}
        onSaveRenames={() => void saveRenames()}
      />
    );
  }

  if (step === "LEADERBOARD" && liveTournament) {
    return (
      <LeaderboardView
        tournament={liveTournament}
        rows={leaderboardRows}
        onBack={() => setStep("LIVE")}
        onBackToList={() => backToList(setStep)}
        onOpenPlayer={(playerId) => {
          setSelectedPlayerId(playerId);
          setStep("PLAYER_GAMES");
        }}
      />
    );
  }

  if (step === "PLAYER_GAMES" && selectedPlayerId) {
    const playerName = playerNameById.get(selectedPlayerId) ?? selectedPlayerId;
    const row = leaderboardRows.find((entry) => entry.playerId === selectedPlayerId);
    return (
      <PlayerGamesView
        playerName={playerName}
        row={row}
        games={selectedPlayerGames}
        onBack={() => setStep("LEADERBOARD")}
      />
    );
  }

  return (
    <MatchSettingsStepView
      mode={mode}
      modeLabel={modeLabel}
      schedulingMode={effectiveSchedulingMode}
      settingsPhase={settingsPhase}
      scoringMode={scoringMode}
      setFormat={setFormat}
      gameWinBy={gameWinBy}
      setsToWin={setsToWin}
      setTiebreakTo={setTiebreakTo}
      matchTiebreak={matchTiebreak}
      courtsText={courtsText}
      pointsText={pointsText}
      targetGamesText={targetGamesText}
      tournamentTimeText={tournamentTimeText}
      estimate={estimate}
      responseText={responseText}
      errorText={errorText}
      playersCount={sanitizedPlayers.length}
      onChangeScoringMode={setScoringMode}
      onChangeSetFormat={setSetFormat}
      onChangeGameWinBy={setGameWinBy}
      onChangeSetsToWin={setSetsToWin}
      onChangeSetTiebreakTo={setSetTiebreakTo}
      onChangeMatchTiebreak={setMatchTiebreak}
      onChangeCourts={onChangeCourtsValue}
      onChangePoints={onChangePointsValue}
      onChangeTargetGames={onChangeTargetGamesValue}
      onChangeTournamentTime={onChangeTournamentTimeValue}
      onBackToPlayers={() => setStep("PLAYERS")}
      onBackToMode={() => setSettingsPhase("MODE")}
      onNextFromMode={() => setSettingsPhase("DETAILS")}
      onCreate={() => void createTournament()}
    />
  );
}
