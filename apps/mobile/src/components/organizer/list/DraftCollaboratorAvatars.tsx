import { Text, View } from "react-native";
import type { TournamentDraftSummary } from "@padel/shared";

import { useTheme } from "../../../theme/ThemeProvider";

const SIZE = 24;
const MAX_SHOWN = 3;

/** Overlapping initials for the owner + co-organizers of a shared draft. */
export function DraftCollaboratorAvatars({ people }: { people: TournamentDraftSummary["collaborators"] }) {
  const { colors } = useTheme();
  if (people.length === 0) return null;
  const shown = people.slice(0, MAX_SHOWN);
  const extra = people.length - shown.length;
  return (
    <View
      style={{ flexDirection: "row" }}
      accessibilityLabel={`Shared with ${people.map((person) => person.name).join(", ")}`}
    >
      {shown.map((person, index) => (
        <View
          key={person.userId}
          style={{
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            marginLeft: index === 0 ? 0 : -8,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 2,
            borderColor: colors.surface,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text style={{ fontSize: 9, fontWeight: "700", color: colors.primary }}>{person.initials}</Text>
        </View>
      ))}
      {extra > 0 ? <Text style={{ marginLeft: 4, fontSize: 11, color: colors.muted }}>+{extra}</Text> : null}
    </View>
  );
}
