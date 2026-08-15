import { View } from "react-native";

import { LiveTournamentView } from "./LiveTournamentView";
import type { LiveTournamentViewProps } from "../../../types/organizer/liveTournamentView";

export function OrganizerLiveScreen(props: LiveTournamentViewProps) {
  return (
    <View style={{ flex: 1 }}>
      <LiveTournamentView {...props} />
    </View>
  );
}
