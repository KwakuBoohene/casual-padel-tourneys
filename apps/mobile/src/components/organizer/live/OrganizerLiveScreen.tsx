import { View } from "react-native";

import { LiveTournamentView } from "./LiveTournamentView";
import type { LiveTournamentViewProps } from "./liveTournamentView.types";

export function OrganizerLiveScreen(props: LiveTournamentViewProps) {
  return (
    <View style={{ flex: 1 }}>
      <LiveTournamentView {...props} />
    </View>
  );
}
