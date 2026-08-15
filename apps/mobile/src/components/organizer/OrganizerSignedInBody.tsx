import { ProfileScreen } from "../../screens/ProfileScreen";
import { useOrganizerScreen } from "../../hooks/organizer/useOrganizerScreen";
import { formatTournamentMode } from "../../utilities/organizer/formatLabels";

import { GameEstimatorView } from "./estimator/GameEstimatorView";
import { LeaderboardView } from "./leaderboard/LeaderboardView";
import { MatchSettingsStepView } from "./create/MatchSettingsStepView";
import { NameStepView } from "./create/NameStepView";
import { OrganizerListScreen } from "./list/OrganizerListScreen";
import { OrganizerLiveScreen } from "./live/OrganizerLiveScreen";
import { PlayerGamesView } from "./leaderboard/PlayerGamesView";
import { PlayersStepView } from "./create/PlayersStepView";
import { TournamentOptionsStepView } from "./create/TournamentOptionsStepView";

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
    startCreateWithMode,
    startCreateFromEstimator,
    cancelCreateToList,
    variant,
    setVariant,
    setSchedulingMode,
    effectiveSchedulingMode,
    players,
    playerGenders,
    sanitizedPlayers,
    canContinueFromPlayers,
    allKnownPlayerNames,
    addPlayer,
    updatePlayer,
    removePlayerInput,
    selectSuggestion,
    hasDuplicatePlayerNames,
    courtsText,
    pointsText,
    targetGamesText,
    tournamentTimeText,
    estimate,
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
    estimatorMode,
    setEstimatorMode,
    estimatorVariant,
    setEstimatorVariant,
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
    scoreInputs,
    updateScoreInput,
    submitRoundScores,
    scoreEntry,
    requestOpenScoreEntry,
    closeScoreEntry,
    changeScoreA,
    changeScoreB,
    undoScoreEntry,
    saveScoreEntry,
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
    handleSignOut
  } = org;

  const modeLabel = formatTournamentMode(mode);

  if (step === "LIST") {
    return (
      <OrganizerListScreen
        tournaments={tournaments}
        refreshing={listRefreshing}
        errorText={errorText}
        showTournamentOptionsModal={showTournamentOptionsModal}
        showTournamentActionConfirmModal={showTournamentActionConfirmModal}
        pendingTournamentAction={pendingTournamentAction}
        onRefresh={() => void loadTournaments()}
        onCreateAmericano={() => startCreateWithMode("AMERICANO")}
        onCreateMexicano={() => startCreateWithMode("MEXICANO")}
        onOpenEstimator={() => setStep("ESTIMATOR")}
        onOpenTournament={(id) => void openTournament(id)}
        onOpenOptions={openTournamentOptions}
        onOpenProfile={() => setStep("PROFILE")}
        onCloseOptionsModal={() => setShowTournamentOptionsModal(false)}
        onRequestEdit={() => requestTournamentAction("EDIT")}
        onRequestDelete={() => requestTournamentAction("DELETE")}
        onCancelActionConfirm={() => setShowTournamentActionConfirmModal(false)}
        onConfirmAction={() => void confirmTournamentAction()}
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
        onUseInNewTournament={() =>
          startCreateFromEstimator({
            mode: estimatorMode,
            variant: estimatorVariant,
            schedulingMode: effectiveEstimatorSchedulingMode,
            courtsText: estimatorCourtsText,
            pointsText: estimatorPointsText,
            targetGamesText: estimatorTargetGamesText,
            tournamentTimeText: estimatorTournamentTimeText
          })
        }
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
        modeLabel={modeLabel}
        players={players}
        genders={playerGenders}
        variant={variant}
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
        savingScore={savingScore}
        pendingCompletedEditMatchId={pendingCompletedEditMatchId}
        scoreSheetError={scoreSheetError}
        focusSubmitMatchId={focusSubmitMatchId}
        scoreInputs={scoreInputs}
        playerNameById={playerNameById}
        showEditConfirmModal={showEditConfirmModal}
        onBackToList={() => setStep("LIST")}
        onViewLeaderboard={() => setStep("LEADERBOARD")}
        onRefresh={() => void refreshTournament()}
        onFinishTournament={finishTournament}
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
        onBackToList={() => setStep("LIST")}
        onOpenPlayer={(playerId) => {
          setSelectedPlayerId(playerId);
          setStep("PLAYER_GAMES");
        }}
      />
    );
  }

  if (step === "PROFILE" && currentUser) {
    return (
      <ProfileScreen
        user={currentUser}
        onBack={() => setStep("LIST")}
        onSignOut={() => void handleSignOut()}
        onAttachAccount={() => setStep("ATTACH")}
      />
    );
  }

  if (step === "PLAYER_GAMES" && selectedPlayerId) {
    const playerName = playerNameById.get(selectedPlayerId) ?? selectedPlayerId;
    const totalPoints =
      leaderboardRows.find((row) => row.playerId === selectedPlayerId)?.totalPoints ?? 0;
    return (
      <PlayerGamesView
        playerName={playerName}
        totalPoints={totalPoints}
        games={selectedPlayerGames}
        onBack={() => setStep("LEADERBOARD")}
      />
    );
  }

  return (
    <MatchSettingsStepView
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
