import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { OrganizerActivityEntry } from "@padel/shared";
import { fetchOrganizerActivity } from "../../api/organizerAccess";
import { useTheme } from "../../theme/ThemeProvider";
import { AccessButton } from "./AccessButton";

function label(action: string) {
  const names: Record<string, string> = {
    INVITATION_CREATED: "Invited a manager",
    INVITATION_RESENT: "Resent an invitation",
    INVITATION_ACCEPTED: "Accepted manager access",
    INVITATION_REVOKED: "Revoked an invitation",
    MANAGER_REMOVED: "Removed a manager",
    MANAGER_LEFT: "Left organizer account",
    HISTORICAL_IMPORT_CREATED: "Imported historical results",
    HISTORICAL_IMPORT_CORRECTED: "Corrected historical results",
    HISTORICAL_IMPORT_INCLUDED: "Included historical results",
    HISTORICAL_IMPORT_EXCLUDED: "Excluded historical results"
  };
  if (names[action]) return names[action];
  if (action === "POST /tournaments") return "Created a tournament";
  if (action.includes("score")) return "Updated scores";
  if (action.includes("career-share")) return "Changed leaderboard sharing";
  if (action.includes("career-leaderboard")) return "Changed career contributions";
  if (action.includes("/close") || action.includes("/end")) return "Closed a tournament";
  if (action.includes("next-round")) return "Generated the next round";
  if (action.includes("/merge")) return "Merged player careers";
  if (action.includes("players")) return "Managed players";
  if (action.startsWith("DELETE")) return "Deleted a tournament";
  return "Updated a tournament";
}
export function ActivityPanel({ organizerId }: { organizerId: string }) {
  const { colors } = useTheme();
  const [rows, setRows] = useState<OrganizerActivityEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  /** Fetches a page; results are applied only while `isCurrent()` holds, so stale responses are dropped. */
  const fetchPage = useCallback(
    (next: string | undefined, isCurrent: () => boolean) =>
      fetchOrganizerActivity(organizerId, next)
        .then(
          (response) => {
            if (!isCurrent()) return;
            setRows((rows) => (next ? [...rows, ...response.data] : response.data));
            setCursor(response.nextCursor);
            setError("");
          },
          (e: unknown) => {
            if (isCurrent()) setError((e as Error).message);
          }
        )
        .finally(() => {
          if (isCurrent()) setLoading(false);
        }),
    [organizerId]
  );
  const load = useCallback(
    async (next?: string) => {
      setLoading(true);
      await fetchPage(next, () => true);
    },
    [fetchPage]
  );
  // Switching organizer shows the loading state immediately, before the fetch effect runs.
  const [requestedOrganizer, setRequestedOrganizer] = useState<string | null>(null);
  if (requestedOrganizer !== organizerId) {
    setRequestedOrganizer(organizerId);
    setLoading(true);
  }
  useEffect(() => {
    let active = true;
    void fetchPage(undefined, () => active);
    return () => {
      active = false;
    };
  }, [fetchPage]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: "700" }}>Activity</Text>
      {rows.length === 0 && !loading ? <Text style={{ color: colors.muted }}>No activity yet.</Text> : null}
      {rows.map((row) => (
        <View key={row.id} style={{ paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{label(row.action)}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {row.actorName} · {new Date(row.occurredAt).toLocaleString()}
          </Text>
        </View>
      ))}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {cursor ? (
        <AccessButton
          label="Load more activity"
          secondary
          disabled={loading}
          onPress={() => void load(cursor)}
        />
      ) : null}
    </View>
  );
}
