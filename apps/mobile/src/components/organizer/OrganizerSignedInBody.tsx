import { router } from "expo-router";
import { KohScreen } from "../../screens/KohScreen";
import { useOrganizerScreen } from "../../hooks/organizer/useOrganizerScreen";
import { formatTournamentMode } from "../../utilities/organizer/formatLabels";
import { tournamentLeaderboardPath, tournamentLivePath } from "../../utilities/organizer/tournamentRoutes";

import { AccountPlayersFlow } from "../accountPlayers/AccountPlayersFlow";
import { KohLiveHub } from "../koh/live/KohLiveHub";
import { MatchSettingsStepView } from "./create/MatchSettingsStepView";
import { NameStepView } from "./create/NameStepView";
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
    backToList(setStep);
    return null;
  }

  if (step === "LIVE" || step === "LEADERBOARD" || step === "PLAYER_GAMES") {
    if (liveTournament) {
      router.replace(
        step === "LEADERBOARD"
          ? tournamentLeaderboardPath(liveTournament.id)
          : tournamentLivePath(liveTournament.id)
      );
      return null;
    }
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
