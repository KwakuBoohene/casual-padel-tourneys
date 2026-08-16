import { router } from "expo-router";
import { KohScreen } from "../../screens/KohScreen";
import { useOrganizerScreen } from "../../hooks/organizer/useOrganizerScreen";

import { AccountPlayersFlow } from "../accountPlayers/AccountPlayersFlow";
import { KohLiveHub } from "../koh/live/KohLiveHub";

function backToList(setStep: (step: "LIST") => void): void {
  setStep("LIST");
  router.replace("/tournaments");
}

/**
 * Temp host for KOH + account-players until those get dedicated routes.
 * Create / live / list / profile live under Expo Router.
 */
export function OrganizerSignedInBody({ org }: { org: ReturnType<typeof useOrganizerScreen> }) {
  const {
    currentUser,
    step,
    setStep,
    errorText,
    loadTournaments,
    viewerBaseUrl,
    kohHub,
    adoptKohHub,
    clearKohHub,
    setKohHub,
    setErrorText,
    markEmailVerifyRequired
  } = org;

  if (
    step === "LIST" ||
    step === "ESTIMATOR" ||
    step === "PROFILE" ||
    step === "ATTACH" ||
    step === "NAME" ||
    step === "OPTIONS" ||
    step === "PLAYERS" ||
    step === "SETTINGS" ||
    step === "LIVE" ||
    step === "LEADERBOARD" ||
    step === "PLAYER_GAMES"
  ) {
    if (step === "NAME" || step === "OPTIONS" || step === "PLAYERS" || step === "SETTINGS") {
      router.replace("/create");
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

  backToList(setStep);
  return null;
}
