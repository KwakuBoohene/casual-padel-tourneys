import { Modal, Pressable, Text, View } from "react-native";

import { SignInScreen } from "./SignInScreen";
import { useOrganizerScreen } from "./OrganizerScreen/hooks/useOrganizerScreen";
import { colors, radius, spacing } from "../theme";
import { GameEstimatorView } from "./organizer/GameEstimatorView";
import { LeaderboardView } from "./organizer/LeaderboardView";
import { LiveTournamentView } from "./organizer/LiveTournamentView";
import { MatchSettingsStepView } from "./organizer/MatchSettingsStepView";
import { NameStepView } from "./organizer/NameStepView";
import { PlayerGamesView } from "./organizer/PlayerGamesView";
import { PlayersStepView } from "./organizer/PlayersStepView";
import { TournamentListView } from "./organizer/TournamentListView";
import { TournamentOptionsStepView } from "./organizer/TournamentOptionsStepView";
import { ProfileScreen } from "./ProfileScreen";
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
          onOpenProfile={() => setStep("PROFILE")}
        />
        <Modal transparent visible={showTournamentOptionsModal} animationType="fade" onRequestClose={() => setShowTournamentOptionsModal(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                width: "100%",
                maxWidth: 420,
                padding: spacing.lg,
                gap: spacing.sm,
                borderRadius: radius.lg
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Tournament Options</Text>
              <Pressable
                onPress={() => requestTournamentAction("EDIT")}
                style={{
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Edit Tournament</Text>
              </Pressable>
              <Pressable
                onPress={() => requestTournamentAction("DELETE")}
                style={{
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.danger,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text
                  style={{
                    color: "#020617",
                    fontWeight: "700"
                  }}
                >
                  Delete Tournament
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowTournamentOptionsModal(false)}
                style={{
                  paddingVertical: spacing.sm,
                  borderRadius: radius.md,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
              </Pressable>
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
            <View
              style={{
                backgroundColor: colors.surfaceAlt,
                width: "100%",
                maxWidth: 420,
                padding: spacing.lg,
                gap: spacing.md,
                borderRadius: radius.lg
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                {pendingTournamentAction === "DELETE" ? "Delete Tournament?" : "Edit Tournament?"}
              </Text>
              <Text style={{ color: colors.muted }}>
                {pendingTournamentAction === "DELETE"
                  ? "Are you sure you want to delete this tournament?"
                  : "Are you sure you want to edit this tournament?"}
              </Text>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <Pressable
                  onPress={() => setShowTournamentActionConfirmModal(false)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: colors.surface,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Text style={{ color: colors.text, fontWeight: "600" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void confirmTournamentAction()}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.md,
                    backgroundColor: pendingTournamentAction === "DELETE" ? colors.danger : colors.primary,
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Text
                    style={{
                      color: "#020617",
                      fontWeight: "700"
                    }}
                  >
                    Yes
                  </Text>
                </Pressable>
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
