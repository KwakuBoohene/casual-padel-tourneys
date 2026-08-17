import { useLayoutEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import type { TournamentMode } from "@padel/shared";

import { OrganizerCreateWizard } from "../../src/components/organizer/create/OrganizerCreateWizard";
import { useCreateTournament } from "../../src/hooks/organizer/useCreateTournament";
import { PageShell } from "../../src/layout";
import { useOrganizerSession } from "../../src/providers/OrganizerSessionProvider";
import { useTheme } from "../../src/theme/ThemeProvider";

function parseMode(value: string | string[] | undefined): TournamentMode | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === "AMERICANO" || raw === "MEXICANO") return raw;
  return null;
}

export default function CreateTournamentRoute() {
  const { colors } = useTheme();
  const org = useOrganizerSession();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const [boot, setBoot] = useState<"pending" | "ready" | "reject">("pending");

  const create = useCreateTournament({
    tournaments: org.tournaments,
    suggestedPlayerNames: org.suggestedPlayerNames,
    setErrorText: org.setErrorText,
    markEmailVerifyRequired: org.markEmailVerifyRequired,
    adoptTournament: org.adoptTournament
  });

  useLayoutEffect(() => {
    org.setErrorText("");
    const intent = org.consumeCreateIntent();
    if (intent?.kind === "mode") {
      create.startCreateWithMode(intent.mode);
      setBoot("ready");
      return;
    }
    if (intent?.kind === "estimator") {
      create.startCreateFromEstimator(intent.draft);
      setBoot("ready");
      return;
    }
    const mode = parseMode(params.mode);
    if (mode) {
      create.startCreateWithMode(mode);
      setBoot("ready");
      return;
    }
    setBoot("reject");
    // Boot once from intent / ?mode= on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (boot === "reject") {
    return <Redirect href="/tournaments" />;
  }

  if (boot === "pending") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <PageShell>
      <OrganizerCreateWizard create={create} />
    </PageShell>
  );
}
