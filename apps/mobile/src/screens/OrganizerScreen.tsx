import { SignInScreen } from "./SignInScreen";
import { useOrganizerScreen } from "./OrganizerScreen/hooks/useOrganizerScreen";
import { GameEstimatorView } from "./organizer/GameEstimatorView";
import { LeaderboardView } from "./organizer/LeaderboardView";
import { MatchSettingsStepView } from "./organizer/MatchSettingsStepView";
import { NameStepView } from "./organizer/NameStepView";
import { PlayerGamesView } from "./organizer/PlayerGamesView";
import { PlayersStepView } from "./organizer/PlayersStepView";
import { TournamentOptionsStepView } from "./organizer/TournamentOptionsStepView";
import { ProfileScreen } from "./ProfileScreen";
import { OrganizerListScreen } from "./OrganizerScreen/components/OrganizerListScreen";
import { OrganizerLiveScreen } from "./OrganizerScreen/components/OrganizerLiveScreen";
export function OrganizerScreen() {
  const {
    authToken,
    currentUser,
    handleSignedIn,
    handleSignOut,
    step,
    setStep,
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
    allKnownPlayerNames,
    addPlayerInput,
    removePlayerInput,
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
    submitMatchScore,
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
    viewerBaseUrl
  } = useOrganizerScreen();

  if (!authToken || !currentUser) {
    return <SignInScreen onSignedIn={handleSignedIn} />;
  }

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
        onCreateNew={() => setStep("NAME")}
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
        allSuggestions={allKnownPlayerNames}
        onUpdatePlayer={updatePlayerName}
        onUpdateGender={updatePlayerGender}
        onRemovePlayer={removePlayerInput}
        onAddPlayer={addPlayerInput}
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

  if (step === "PROFILE" && currentUser) {
    return <ProfileScreen user={currentUser} onBack={() => setStep("LIST")} onSignOut={handleSignOut} />;
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
      playersCount={sanitizedPlayers.length}
      onChangeCourts={onChangeCourtsValue}
      onChangePoints={onChangePointsValue}
      onChangeTargetGames={onChangeTargetGamesValue}
      onChangeTournamentTime={onChangeTournamentTimeValue}
      onBack={() => setStep("PLAYERS")}
      onCreate={() => void createTournament()}
    />
  );
}
