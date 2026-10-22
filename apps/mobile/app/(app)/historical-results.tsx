import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import {
  HISTORICAL_CSV_TEMPLATE,
  HISTORICAL_NOTICE,
  escapeCsvField,
  type HistoricalImportDetail,
  type HistoricalImportSummary,
  type HistoricalMapping,
  type HistoricalMetadata,
  type HistoricalPreview
} from "@padel/shared";
import {
  listHistoricalResults,
  getHistoricalResult,
  previewHistoricalResults,
  commitHistoricalResults,
  includeHistoricalResults
} from "../../src/api/historicalResults";
import { useOrganizerAccount } from "../../src/providers/OrganizerAccountProvider";
import { AccessButton } from "../../src/components/organizerAccess/AccessButton";
import { AccessConfirm } from "../../src/components/organizerAccess/AccessConfirm";
import { CsvUpload } from "../../src/components/historicalResults/CsvUpload";
import {
  ImportField,
  MappingFields,
  MetadataFields
} from "../../src/components/historicalResults/ImportFields";
import { downloadHistoricalCsv } from "../../src/components/historicalResults/csvDownload";
import { PageShell } from "../../src/layout";
import { useTheme } from "../../src/theme/ThemeProvider";

function correctionCsv(detail: HistoricalImportDetail) {
  const headers = [
    "schema_version",
    "event_key",
    "tournament_name",
    "event_date",
    "tournament_mode",
    "variant",
    "scoring_mode",
    "source_rank",
    "player_name",
    "matches_played",
    "matches_won",
    "matches_lost",
    "matches_drawn",
    "games_won",
    "games_lost",
    "sets_won",
    "sets_lost",
    "americano_points_won",
    "americano_points_lost"
  ];
  const rows = detail.rows.map((row) => [
    1,
    detail.eventKey,
    detail.title,
    detail.eventDate,
    detail.mode,
    detail.variant,
    detail.scoringMode,
    row.rank,
    row.name,
    row.matchesPlayed,
    row.matchesWon,
    row.matchesLost,
    row.matchesDrawn,
    row.gamesWon,
    row.gamesLost,
    row.setsWon,
    row.setsLost,
    row.americanoPointsWon,
    row.americanoPointsLost
  ]);
  return (
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((value) => escapeCsvField(value == null ? "" : String(value))).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
export default function HistoricalResultsScreen() {
  const account = useOrganizerAccount();
  const owner = account.selected!.id;
  const { colors } = useTheme();
  const [imports, setImports] = useState<HistoricalImportSummary[]>([]),
    [detail, setDetail] = useState<HistoricalImportDetail | null>(null),
    [target, setTarget] = useState<HistoricalImportDetail | null>(null);
  const [preview, setPreview] = useState<HistoricalPreview | null>(null),
    [metadata, setMetadata] = useState<HistoricalMetadata | null>(null),
    [mappings, setMappings] = useState<HistoricalMapping[]>([]);
  const [csv, setCsv] = useState(""),
    [filename, setFilename] = useState(""),
    [stage, setStage] = useState<"upload" | "mapping" | "review" | "detail">("upload");
  const [confirmed, setConfirmed] = useState(false),
    [reason, setReason] = useState(""),
    [distinctReason, setDistinctReason] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [inclusionConfirm, setInclusionConfirm] = useState(false);
  const load = useCallback(async () => {
    setImports((await listHistoricalResults(owner)).data);
  }, [owner]);
  useEffect(() => {
    void load().catch((error) => setError(error.message));
  }, [load]);
  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const reset = () => {
    setPreview(null);
    setMetadata(null);
    setMappings([]);
    setCsv("");
    setFilename("");
    setConfirmed(false);
    setReason("");
    setDistinctReason("");
    setError("");
  };
  const open = async (id: string) => {
    setDetail((await getHistoricalResult(owner, id)).data);
    setStage("detail");
    setTarget(null);
  };
  const choose = (text: string, name: string) =>
    void run(async () => {
      const response = await previewHistoricalResults(
        owner,
        { csv: text, filename: name, ...(target ? { expectedVersion: target.version } : {}) },
        target?.id
      );
      reset();
      setCsv(text);
      setFilename(name);
      setPreview(response.data);
      setMetadata(response.data.metadata);
      setMappings(response.data.mappings);
      setStage("mapping");
      setNotice("");
    });
  const section = (title: string) => (
    <Text accessibilityRole="header" style={{ color: colors.text, fontWeight: "800", fontSize: 22 }}>
      {title}
    </Text>
  );
  return (
    <PageShell>
      <ScrollView
        contentContainerStyle={{
          width: "100%",
          maxWidth: 860,
          alignSelf: "center",
          padding: 24,
          gap: 20,
          paddingBottom: 80
        }}
      >
        {section("Historical results")}
        <Text style={{ color: colors.muted }}>
          Importing for {account.selected!.name}
          {"'s organizer account · "}
          {account.selected!.role === "MANAGER" ? "Manager" : "Owner"}
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>{HISTORICAL_NOTICE}</Text>
        <AccessButton
          label="Back to account leaderboard"
          secondary
          disabled={busy}
          onPress={() => router.replace("/account-players")}
        />
        {notice ? (
          <Text accessibilityRole="alert" style={{ color: colors.primary }}>
            {notice}
          </Text>
        ) : null}
        {error ? (
          <Text accessibilityRole="alert" style={{ color: colors.danger }}>
            {error}
          </Text>
        ) : null}
        {stage === "upload" ? (
          <View style={{ gap: 16 }}>
            {section(target ? `Correcting ${target.title}` : "Upload historical results")}
            <Text style={{ color: colors.muted }}>
              One complete event per CSV. Uploading prepares a preview; nothing counts until you confirm.
            </Text>
            {target ? (
              <>
                <Text style={{ color: colors.muted }}>
                  Use the same event key: {target.eventKey}. Prior revisions remain in history.
                </Text>
                <AccessButton
                  label="Download correction CSV"
                  secondary
                  disabled={busy}
                  onPress={() =>
                    void run(async () => {
                      await downloadHistoricalCsv(correctionCsv(target), `${target.eventKey}-correction.csv`);
                    })
                  }
                />
              </>
            ) : null}
            <AccessButton
              label="Download CSV template"
              secondary
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await downloadHistoricalCsv(HISTORICAL_CSV_TEMPLATE, "historical-results-template.csv");
                })
              }
            />
            <CsvUpload onFile={choose} onError={setError} disabled={busy} />
          </View>
        ) : null}
        {stage === "mapping" && preview && metadata ? (
          <View style={{ gap: 20 }}>
            {section(`Review ${filename}`)}
            <MetadataFields
              value={metadata}
              disabled={busy}
              correction={!!target}
              onChange={(next) => {
                setMetadata(next);
                setConfirmed(false);
              }}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="I confirm the event details"
              accessibilityState={{ checked: confirmed }}
              disabled={busy}
              onPress={() => setConfirmed(!confirmed)}
              style={{ padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }}
            >
              <Text style={{ color: colors.text }}>
                {confirmed ? "☑" : "☐"} I confirm the event name, actual date, mode and scoring.
              </Text>
            </Pressable>
            {preview.warnings.map((warning) => (
              <Text key={warning} style={{ color: colors.muted, lineHeight: 22 }}>
                {warning}
              </Text>
            ))}
            <MappingFields preview={preview} mappings={mappings} onChange={setMappings} disabled={busy} />
            {target ? (
              <ImportField label="Correction reason" value={reason} disabled={busy} onChange={setReason} />
            ) : null}
            <ImportField
              label="Distinct-event explanation (only if duplicate or live overlap is flagged)"
              value={distinctReason}
              disabled={busy}
              onChange={setDistinctReason}
            />
            <AccessButton
              label="Review leaderboard changes"
              disabled={busy || !confirmed || mappings.some((row) => !row.reviewed)}
              onPress={() =>
                void run(async () => {
                  const response = await previewHistoricalResults(
                    owner,
                    {
                      csv,
                      filename,
                      metadata,
                      mappings,
                      confirmed: true,
                      reason,
                      distinctReason,
                      ...(target ? { expectedVersion: target.version } : {})
                    },
                    target?.id
                  );
                  setPreview(response.data);
                  setStage("review");
                })
              }
            />
            <AccessButton
              label="Cancel upload"
              secondary
              disabled={busy}
              onPress={() => {
                reset();
                setTarget(null);
                setStage("upload");
              }}
            />
          </View>
        ) : null}
        {stage === "review" && preview ? (
          <View style={{ gap: 16 }}>
            {section("Confirm leaderboard changes")}
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>
              {preview.metadata.title} · {preview.metadata.eventDate} · {preview.rows.length} players
            </Text>
            <Text style={{ color: colors.muted }}>
              All-time totals below include existing live and imported results. This event contributes to its
              historical month and year, not the upload date.
            </Text>
            {preview.changes.map((change, index) => (
              <View
                key={index}
                style={{ borderBottomWidth: 1, borderColor: colors.border, paddingVertical: 12, gap: 5 }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>{change.name}</Text>
                <Text style={{ color: colors.muted }}>
                  Matches played {change.beforePlayed} → {change.afterPlayed} · Wins {change.beforeWins} →{" "}
                  {change.afterWins}
                </Text>
              </View>
            ))}
            {preview.warnings.map((warning) => (
              <Text key={warning} style={{ color: colors.muted }}>
                {warning}
              </Text>
            ))}
            <AccessButton
              label={target ? "Confirm correction" : "Confirm import"}
              disabled={busy || !preview.previewToken}
              onPress={() =>
                void run(async () => {
                  const result = await commitHistoricalResults(owner, preview.previewToken!, target?.id);
                  reset();
                  setTarget(null);
                  setNotice(
                    "Historical results saved. Supported totals are included; individual match details remain unavailable."
                  );
                  await load();
                  await open(result.data.id);
                })
              }
            />
            <AccessButton
              label="Back to player mapping"
              secondary
              disabled={busy}
              onPress={() => setStage("mapping")}
            />
          </View>
        ) : null}
        {stage === "detail" && detail ? (
          <View style={{ gap: 16 }}>
            {section(detail.title)}
            <Text style={{ color: colors.text }}>
              Imported summary · {detail.eventDate} ·{" "}
              {detail.included ? "Included in leaderboard" : "Excluded from leaderboard"} · Version{" "}
              {detail.version}
            </Text>
            <Text style={{ color: colors.muted }}>
              Imported by {detail.createdByName}. Source ranks below are the original event standings.
            </Text>
            {detail.rows.map((row) => (
              <View
                key={row.rowNumber}
                style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, gap: 6 }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  {row.rank}. {row.playerName}
                  {row.playerName !== row.name ? ` (source: ${row.name})` : ""}
                </Text>
                <Text style={{ color: colors.muted }}>
                  MP {row.matchesPlayed} · W {row.matchesWon} · L {row.matchesLost} · D {row.matchesDrawn} ·
                  GW {row.gamesWon ?? "N/A"} · GL {row.gamesLost ?? "N/A"} · SW {row.setsWon ?? "N/A"} · SL{" "}
                  {row.setsLost ?? "N/A"}
                  {detail.scoringMode === "AMERICANO_POINTS"
                    ? ` · PW(A) ${row.americanoPointsWon} · PL(A) ${row.americanoPointsLost}`
                    : ""}
                </Text>
              </View>
            ))}
            <AccessButton
              label={detail.included ? "Exclude from leaderboard" : "Include in leaderboard"}
              secondary
              disabled={busy}
              onPress={() => setInclusionConfirm(true)}
            />
            <AccessButton
              label="Correct this import"
              secondary
              disabled={busy}
              onPress={() => {
                reset();
                setTarget(detail);
                setStage("upload");
              }}
            />
            {section("Revision history")}
            {detail.revisions.map((revision) => (
              <Text key={revision.number} style={{ color: colors.muted }}>
                Revision {revision.number} · {revision.actorName} ·{" "}
                {new Date(revision.createdAt).toLocaleString()} · {revision.reason}
              </Text>
            ))}
            <AccessButton
              label="Upload another event"
              disabled={busy}
              onPress={() => {
                reset();
                setDetail(null);
                setTarget(null);
                setStage("upload");
              }}
            />
          </View>
        ) : null}
        {section("Imported events")}
        {!imports.length ? <Text style={{ color: colors.muted }}>No historical imports yet.</Text> : null}
        {imports.map((item) => (
          <AccessButton
            key={item.id}
            label={`${item.title} · ${item.eventDate} · ${item.playerCount} players · ${item.included ? "Included" : "Excluded"}`}
            secondary
            disabled={busy}
            onPress={() =>
              void run(async () => {
                reset();
                await open(item.id);
              })
            }
          />
        ))}
        {imports.length >= 200 ? (
          <Text style={{ color: colors.muted }}>Showing the newest 200 historical imports.</Text>
        ) : null}
        {inclusionConfirm && detail ? (
          <AccessConfirm
            title={detail.included ? "Exclude historical results?" : "Include historical results?"}
            description="Only this import's contribution changes. Live matches and the original historical record remain intact. This action is reversible."
            busy={busy}
            onCancel={() => setInclusionConfirm(false)}
            onConfirm={() =>
              void run(async () => {
                await includeHistoricalResults(owner, detail.id, detail.version, !detail.included);
                setInclusionConfirm(false);
                await load();
                await open(detail.id);
                setNotice("Leaderboard inclusion updated.");
              })
            }
          />
        ) : null}
      </ScrollView>
    </PageShell>
  );
}
