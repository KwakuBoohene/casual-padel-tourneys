import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import type {
  HistoricalMetadata,
  HistoricalMapping,
  HistoricalSourceRow,
  HistoricalPreview,
  HistoricalImportDetail,
  HistoricalImportSummary
} from "@padel/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma.js";
import { validation, conflict, notFound } from "../../../shared/kernel/appError.js";
import { resolveAccess, requirePersistedVerifiedUser } from "../../organizerAccess/infrastructure/access.js";
import { readHistoricalCsv } from "../domain/historicalCsv.js";
import { normalizeOrganizerPlayerName } from "../domain/careerRange.js";
import { listHistoricalContributions } from "./historicalContributions.js";

const text = z.string().trim().min(1).max(160);
const metadataSchema = z.object({
  eventKey: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_-]{1,100}$/),
  title: text,
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mode: z.enum(["AMERICANO", "MEXICANO", "KING_OF_THE_COURT"]),
  variant: z.enum(["CLASSIC", "TEAM", "MIXED", ""]),
  scoringMode: z.enum(["REGULAR", "AMERICANO_POINTS"])
});
export const historicalPreviewInput = z.object({
  csv: z.string().min(1).max(1048576),
  filename: text.max(255),
  metadata: z
    .object({
      eventKey: z.string(),
      title: z.string(),
      eventDate: z.string(),
      mode: z.string(),
      variant: z.string(),
      scoringMode: z.string()
    })
    .partial()
    .optional(),
  mappings: z
    .array(
      z.object({
        rowNumber: z.number().int().positive(),
        playerId: z.string().min(1).nullable(),
        newName: z.string().trim().min(1).max(80),
        reviewed: z.boolean()
      })
    )
    .max(1000)
    .optional(),
  confirmed: z.boolean().default(false),
  expectedVersion: z.number().int().positive().optional(),
  reason: z.string().trim().max(500).default(""),
  distinctReason: z.string().trim().max(500).default("")
});
interface PreviewGrant {
  purpose: "historical-results";
  actor: string;
  owner: string;
  requestKey: string;
  targetId?: string;
  expectedVersion?: number;
  metadata: HistoricalMetadata;
  rows: HistoricalSourceRow[];
  mappings: HistoricalMapping[];
  filename: string;
  sourceCsv: string;
  fileHash: string;
  fingerprint: string;
  reason: string;
  distinctReason: string;
}
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
// Preview tickets cannot be used as login tokens, even by consumers that ignore JWT audiences.
const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
  return hash(`historical-result-preview:${process.env.JWT_SECRET}`);
};
const placeholder = (name: string) => /^(random|unknown|guest|player\s*\d*|tbd)$/i.test(name.trim());

/** Compare real credited results as well as titles, so renamed exports can still flag overlap. */
async function liveOverlap(
  owner: string,
  metadata: HistoricalMetadata,
  rows: HistoricalSourceRow[],
  client: Prisma.TransactionClient = prisma
): Promise<boolean> {
  if (
    await client.tournament.findFirst({
      where: { organizerId: owner, name: { equals: metadata.title, mode: "insensitive" } },
      select: { id: true }
    })
  )
    return true;
  const day = new Date(`${metadata.eventDate}T00:00:00.000Z`);
  if (!Number.isFinite(day.getTime()) || !metadata.mode) return false;
  const next = new Date(day.getTime() + 86400000);
  const credits = await client.organizerPlayerStatDelta.findMany({
    where: { organizerId: owner, tournamentMode: metadata.mode, occurredAt: { gte: day, lt: next } },
    select: {
      tournamentId: true,
      matchesWon: true,
      matchesLost: true,
      matchesDrawn: true,
      gamesWon: true,
      gamesLost: true,
      americanoPointsWon: true,
      americanoPointsLost: true,
      organizerPlayer: { select: { name: true } }
    },
    take: 5001
  });
  if (credits.length > 5000) return true; // Bounded detection; require explicit review for a very large day.
  const events = new Map<string, Map<string, number[]>>();
  for (const credit of credits) {
    const people = events.get(credit.tournamentId) ?? new Map<string, number[]>();
    const name = normalizeOrganizerPlayerName(credit.organizerPlayer.name);
    const sum = people.get(name) ?? [0, 0, 0, 0, 0, 0, 0];
    const values = [
      credit.matchesWon,
      credit.matchesLost,
      credit.matchesDrawn,
      metadata.scoringMode === "REGULAR" ? credit.gamesWon : 0,
      metadata.scoringMode === "REGULAR" ? credit.gamesLost : 0,
      credit.americanoPointsWon,
      credit.americanoPointsLost
    ];
    for (let i = 0; i < values.length; i += 1) sum[i] += values[i];
    people.set(name, sum);
    events.set(credit.tournamentId, people);
  }
  return [...events.values()].some(
    (people) =>
      people.size === rows.length &&
      rows.every((row) => {
        const sums = people.get(normalizeOrganizerPlayerName(row.name));
        const values = [
          row.matchesWon,
          row.matchesLost,
          row.matchesDrawn,
          row.gamesWon ?? 0,
          row.gamesLost ?? 0,
          row.americanoPointsWon ?? 0,
          row.americanoPointsLost ?? 0
        ];
        return sums && values.every((value, index) => sums[index] === value);
      })
  );
}

function validateMetadata(value: HistoricalMetadata) {
  const parsed = metadataSchema.safeParse(value);
  if (!parsed.success)
    throw validation("Confirm the event key, title, date, tournament mode, variant and scoring format.");
  const date = new Date(`${value.eventDate}T00:00:00.000Z`);
  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value.eventDate ||
    value.eventDate > new Date().toISOString().slice(0, 10)
  )
    throw validation("Choose a valid historical event date, not a future date.");
  if (value.mode === "KING_OF_THE_COURT" && value.scoringMode !== "REGULAR")
    throw validation("King of the Court requires Regular scoring.");
}

export async function previewHistoricalImport(
  owner: string,
  actor: string,
  input: z.infer<typeof historicalPreviewInput>,
  targetId?: string
): Promise<HistoricalPreview> {
  const source = readHistoricalCsv(input.csv);
  const metadata = { ...source.metadata, ...input.metadata } as HistoricalMetadata;
  if (metadata.mode && !["AMERICANO", "MEXICANO", "KING_OF_THE_COURT"].includes(metadata.mode))
    throw validation("Unsupported tournament mode.");
  if (!["", "CLASSIC", "TEAM", "MIXED"].includes(metadata.variant))
    throw validation("Unsupported tournament variant.");
  if (metadata.eventKey.length > 100 || metadata.title.length > 160 || metadata.eventDate.length > 10)
    throw validation("Event metadata is too long.");
  // Changing the scoring interpretation would invalidate source validation.
  if (metadata.scoringMode !== source.metadata.scoringMode)
    throw validation("Scoring mode must match the CSV. Correct the file and preview again.");
  const target = targetId
    ? await prisma.historicalResultImport.findFirst({ where: { id: targetId, organizerId: owner } })
    : null;
  if (targetId && !target) throw notFound("Historical import not found.");
  if (target && (input.expectedVersion !== target.version || metadata.eventKey !== target.eventKey))
    throw conflict(
      "This import changed. Reload it before preparing a correction; its event key must stay the same."
    );
  const players = await prisma.organizerPlayer.findMany({
    where: { organizerId: owner, archivedAt: null },
    select: { id: true, name: true, nameNormalized: true },
    orderBy: { name: "asc" }
  });
  const mappings =
    input.mappings ??
    source.rows.map((row) => ({
      rowNumber: row.rowNumber,
      playerId: placeholder(row.name)
        ? null
        : (players.find((player) => player.nameNormalized === normalizeOrganizerPlayerName(row.name))?.id ??
          null),
      newName: row.name,
      reviewed: !placeholder(row.name)
    }));
  if (
    mappings.length !== source.rows.length ||
    new Set(mappings.map((row) => row.rowNumber)).size !== source.rows.length
  )
    throw validation("Map every source row exactly once.");
  const ids = new Set<string>(),
    newNames = new Set<string>();
  for (const row of source.rows) {
    const mapping = mappings.find((item) => item.rowNumber === row.rowNumber);
    if (!mapping) throw validation("A player mapping is missing.");
    if (mapping.playerId) {
      if (!players.some((player) => player.id === mapping.playerId))
        throw validation("Mapped player is unavailable in this organizer account.");
      if (ids.has(mapping.playerId)) throw validation("Two rows cannot map to the same player in one event.");
      ids.add(mapping.playerId);
    } else {
      const name = normalizeOrganizerPlayerName(mapping.newName);
      if (newNames.has(name)) throw validation("Two new players have the same name.");
      if (input.confirmed && players.some((player) => player.nameNormalized === name))
        throw validation(
          `An active player named ${mapping.newName} exists. Select that identity or choose a different new name.`
        );
      newNames.add(name);
    }
  }
  const warnings = [
    "Imported summary only: individual match scores, opponents and partnerships are unavailable."
  ];
  if (target && !target.included)
    warnings.push(
      "This event is excluded. Correcting it will not include its totals until you explicitly reinclude it."
    );
  if (source.rows.some((row) => row.setsWon === null) && metadata.scoringMode === "REGULAR")
    warnings.push("Set totals are unknown. Set tie-breaks will be skipped in affected match-win tie groups.");
  if (source.rows.some((row) => placeholder(row.name)))
    warnings.push(
      "Review placeholder names such as Random explicitly. They may identify different people in different events."
    );
  const fingerprint = hash(
    JSON.stringify({
      date: metadata.eventDate,
      mode: metadata.mode,
      scoring: metadata.scoringMode,
      rows: source.rows
        .map((row) => ({
          name: normalizeOrganizerPlayerName(row.name),
          w: row.matchesWon,
          l: row.matchesLost,
          d: row.matchesDrawn,
          gw: row.gamesWon,
          gl: row.gamesLost,
          sw: row.setsWon,
          sl: row.setsLost,
          pw: row.americanoPointsWon,
          pl: row.americanoPointsLost
        }))
        .sort((a, b) => a.name.localeCompare(b.name))
    })
  );
  const duplicate = await prisma.historicalResultImport.findFirst({
    where: { organizerId: owner, fingerprint, ...(targetId ? { NOT: { id: targetId } } : {}) }
  });
  if (duplicate)
    warnings.push(
      `Possible duplicate: ${duplicate.title}. A distinct-event reason is required to count these totals again.`
    );
  const hasLiveOverlap = await liveOverlap(owner, metadata, source.rows);
  if (hasLiveOverlap)
    warnings.push(
      "Possible live-event overlap by title or credited results. Confirm this historical event is distinct, or exclude the live event's career contribution to prevent overlap."
    );
  const deltas = await prisma.organizerPlayerStatDelta.groupBy({
    by: ["organizerPlayerId"],
    where: { organizerId: owner },
    _sum: { matchesWon: true, matchesLost: true, matchesDrawn: true }
  });
  const historical = await listHistoricalContributions({ organizerId: owner, since: null });
  const totals = new Map<string, { won: number; played: number }>();
  for (const row of deltas)
    totals.set(row.organizerPlayerId, {
      won: row._sum.matchesWon ?? 0,
      played: (row._sum.matchesWon ?? 0) + (row._sum.matchesLost ?? 0) + (row._sum.matchesDrawn ?? 0)
    });
  for (const row of historical) {
    const current = totals.get(row.organizerPlayerId) ?? { won: 0, played: 0 };
    current.won += row.matchesWon;
    current.played += row.matchesWon + row.matchesLost + row.matchesDrawn;
    totals.set(row.organizerPlayerId, current);
  }
  const replaced = target?.included ? historical.filter((row) => row.historical?.importId === targetId) : [];
  const changes = source.rows.map((row) => {
    const mapping = mappings.find((item) => item.rowNumber === row.rowNumber)!;
    const before = totals.get(mapping.playerId ?? "") ?? { won: 0, played: 0 };
    const previous = replaced.find((item) => item.organizerPlayerId === mapping.playerId);
    return {
      name: players.find((p) => p.id === mapping.playerId)?.name ?? mapping.newName,
      beforeWins: before.won,
      afterWins: before.won - (previous?.matchesWon ?? 0) + (target && !target.included ? 0 : row.matchesWon),
      beforePlayed: before.played,
      afterPlayed:
        before.played -
        (previous ? previous.matchesWon + previous.matchesLost + previous.matchesDrawn : 0) +
        (target && !target.included ? 0 : row.matchesPlayed)
    };
  });
  for (const row of replaced.filter(
    (row) => !mappings.some((mapping) => mapping.playerId === row.organizerPlayerId)
  )) {
    const before = totals.get(row.organizerPlayerId)!;
    changes.push({
      name: row.organizerPlayerName,
      beforeWins: before.won,
      afterWins: before.won - row.matchesWon,
      beforePlayed: before.played,
      afterPlayed: before.played - row.matchesWon - row.matchesLost - row.matchesDrawn
    });
  }
  let previewToken: string | null = null;
  if (input.confirmed) {
    validateMetadata(metadata);
    if (mappings.some((mapping) => !mapping.reviewed))
      throw validation("Explicitly review every flagged player identity.");
    if (targetId && input.reason.length < 5)
      throw validation("Explain the correction (at least five characters).");
    if ((duplicate || hasLiveOverlap) && input.distinctReason.length < 10)
      throw conflict("Possible duplicate results. Explain why this is a distinct event before continuing.");
    const grant: PreviewGrant = {
      purpose: "historical-results",
      actor,
      owner,
      requestKey: randomUUID(),
      targetId,
      expectedVersion: input.expectedVersion,
      metadata,
      rows: source.rows,
      mappings,
      filename: input.filename,
      sourceCsv: input.csv,
      fileHash: hash(input.csv),
      fingerprint,
      reason: input.reason,
      distinctReason: input.distinctReason
    };
    previewToken = jwt.sign(grant, secret(), {
      algorithm: "HS256",
      audience: "historical-result-preview",
      expiresIn: "20m"
    });
  }
  return {
    metadata,
    rows: source.rows,
    mappings,
    players: players.map(({ id, name }) => ({ id, name })),
    warnings,
    changes,
    previewToken
  };
}

async function lockedAccess(tx: Prisma.TransactionClient, owner: string, actor: string) {
  await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${owner} FOR UPDATE`;
  await resolveAccess(actor, owner);
  return requirePersistedVerifiedUser(actor);
}

export async function commitHistoricalImport(owner: string, actor: string, token: string, targetId?: string) {
  let grant: PreviewGrant;
  try {
    grant = jwt.verify(token, secret(), {
      algorithms: ["HS256"],
      audience: "historical-result-preview"
    }) as PreviewGrant;
  } catch {
    throw conflict("This preview expired or is invalid. Preview the CSV again.");
  }
  if (
    grant.purpose !== "historical-results" ||
    grant.owner !== owner ||
    grant.actor !== actor ||
    grant.targetId !== targetId
  )
    throw validation("This preview belongs to another actor, organizer or import.");
  validateMetadata(grant.metadata);
  return prisma.$transaction(
    async (tx) => {
      const user = await lockedAccess(tx, owner, actor);
      const replay = await tx.historicalResultRevision.findUnique({
        where: { requestKey: grant.requestKey },
        include: { import: true }
      });
      if (replay) return { id: replay.importId, replayed: true };
      const prior = targetId
        ? await tx.historicalResultImport.findFirst({ where: { id: targetId, organizerId: owner } })
        : null;
      if (targetId && !prior) throw notFound("Historical import not found.");
      if (prior && prior.version !== grant.expectedVersion)
        throw conflict("This import changed. Review the latest version before correcting it.");
      if (
        !prior &&
        (await tx.historicalResultImport.findUnique({
          where: { organizerId_eventKey: { organizerId: owner, eventKey: grant.metadata.eventKey } }
        }))
      )
        throw conflict("This event key was already imported. Open the existing import to correct it.");
      if (prior && prior.eventKey !== grant.metadata.eventKey)
        throw validation("The event key cannot change during a correction.");
      const duplicate = await tx.historicalResultImport.findFirst({
        where: {
          organizerId: owner,
          fingerprint: grant.fingerprint,
          ...(targetId ? { NOT: { id: targetId } } : {})
        }
      });
      const overlap = await liveOverlap(owner, grant.metadata, grant.rows, tx);
      if ((duplicate || overlap) && grant.distinctReason.length < 10)
        throw conflict("Possible duplicate results. Preview again with a distinct-event explanation.");
      const mappings = new Map(grant.mappings.map((mapping) => [mapping.rowNumber, mapping]));
      const playerIds = new Set<string>();
      const results = [];
      for (const row of grant.rows) {
        const mapping = mappings.get(row.rowNumber)!;
        let playerId = mapping.playerId;
        if (playerId) {
          if (
            !(await tx.organizerPlayer.findFirst({
              where: { id: playerId, organizerId: owner, archivedAt: null }
            }))
          )
            throw conflict("A mapped player changed. Preview again.");
        } else {
          const normalized = normalizeOrganizerPlayerName(mapping.newName);
          if (
            await tx.organizerPlayer.findUnique({
              where: { organizerId_nameNormalized: { organizerId: owner, nameNormalized: normalized } }
            })
          )
            throw conflict(
              `Player ${mapping.newName} was created while you reviewed. Preview again to map that identity.`
            );
          playerId = (
            await tx.organizerPlayer.create({
              data: { organizerId: owner, name: mapping.newName, nameNormalized: normalized }
            })
          ).id;
        }
        if (playerIds.has(playerId)) throw validation("Two source rows cannot map to one player.");
        playerIds.add(playerId);
        const { name, rank, matchesPlayed: _mp, ...stats } = row;
        results.push({ ...stats, sourceName: name, sourceRank: rank, organizerPlayerId: playerId });
      }
      const data = {
        title: grant.metadata.title,
        eventDate: new Date(grant.metadata.eventDate + "T00:00:00.000Z"),
        mode: grant.metadata.mode as "AMERICANO" | "MEXICANO" | "KING_OF_THE_COURT",
        variant: grant.metadata.variant || null,
        scoringMode: grant.metadata.scoringMode,
        fingerprint: grant.fingerprint
      };
      const logical = prior
        ? await tx.historicalResultImport.update({
            where: { id: prior.id },
            data: { ...data, version: { increment: 1 } }
          })
        : await tx.historicalResultImport.create({
            data: {
              ...data,
              organizerId: owner,
              eventKey: grant.metadata.eventKey,
              createdById: actor,
              createdByName: user.name
            }
          });
      if (prior)
        await tx.historicalResultRevision.updateMany({
          where: { importId: prior.id, active: true },
          data: { active: false }
        });
      await tx.historicalResultRevision.create({
        data: {
          importId: logical.id,
          number: logical.version,
          requestKey: grant.requestKey,
          actorId: actor,
          actorName: user.name,
          reason: grant.reason || grant.distinctReason || "Historical CSV imported",
          filename: grant.filename,
          fileHash: grant.fileHash,
          source: JSON.parse(
            JSON.stringify({
              metadata: grant.metadata,
              originalCsv: grant.sourceCsv,
              rows: grant.rows,
              distinctReason: grant.distinctReason
            })
          ),
          results: { create: results }
        }
      });
      await tx.organizerActivity.create({
        data: {
          organizerId: owner,
          actorUserId: actor,
          actorName: user.name,
          action: prior ? "HISTORICAL_IMPORT_CORRECTED" : "HISTORICAL_IMPORT_CREATED",
          targetId: logical.id,
          metadata: { version: logical.version, players: results.length, eventDate: grant.metadata.eventDate }
        }
      });
      return { id: logical.id, replayed: false };
    },
    { maxWait: 15000, timeout: 30000 }
  );
}

export async function setHistoricalInclusion(
  owner: string,
  actor: string,
  id: string,
  expectedVersion: number,
  included: boolean
) {
  return prisma.$transaction(async (tx) => {
    const user = await lockedAccess(tx, owner, actor);
    const row = await tx.historicalResultImport.findFirst({ where: { id, organizerId: owner } });
    if (!row) throw notFound("Historical import not found.");
    if (row.version !== expectedVersion)
      throw conflict("This import changed. Reload before changing its inclusion.");
    if (row.included === included) return { id, version: row.version, included };
    const updated = await tx.historicalResultImport.update({
      where: { id },
      data: { included, version: { increment: 1 } }
    });
    await tx.organizerActivity.create({
      data: {
        organizerId: owner,
        actorUserId: actor,
        actorName: user.name,
        action: included ? "HISTORICAL_IMPORT_INCLUDED" : "HISTORICAL_IMPORT_EXCLUDED",
        targetId: id,
        metadata: { version: updated.version, included }
      }
    });
    return { id, version: updated.version, included };
  });
}

export async function listHistoricalImports(owner: string): Promise<HistoricalImportSummary[]> {
  const rows = await prisma.historicalResultImport.findMany({
    where: { organizerId: owner },
    include: { revisions: { where: { active: true }, select: { _count: { select: { results: true } } } } },
    orderBy: { eventDate: "desc" },
    take: 200
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    eventDate: row.eventDate.toISOString().slice(0, 10),
    mode: row.mode,
    variant: row.variant ?? "",
    scoringMode: row.scoringMode,
    eventKey: row.eventKey,
    included: row.included,
    version: row.version,
    createdByName: row.createdByName,
    playerCount: row.revisions[0]?._count.results ?? 0
  }));
}

export async function getHistoricalImport(owner: string, id: string): Promise<HistoricalImportDetail> {
  const row = await prisma.historicalResultImport.findFirst({
    where: { id, organizerId: owner },
    include: {
      revisions: {
        orderBy: { number: "desc" },
        select: {
          number: true,
          active: true,
          createdAt: true,
          actorName: true,
          reason: true,
          results: {
            where: { revision: { active: true } },
            include: { player: { select: { name: true } } },
            orderBy: { sourceRank: "asc" }
          }
        }
      }
    }
  });
  if (!row) throw notFound("Historical import not found.");
  const active = row.revisions.find((revision) => revision.active);
  return {
    id: row.id,
    title: row.title,
    eventDate: row.eventDate.toISOString().slice(0, 10),
    mode: row.mode,
    variant: row.variant ?? "",
    scoringMode: row.scoringMode,
    eventKey: row.eventKey,
    included: row.included,
    version: row.version,
    createdByName: row.createdByName,
    playerCount: active?.results.length ?? 0,
    rows: (active?.results ?? []).map((result) => ({
      rowNumber: result.rowNumber,
      rank: result.sourceRank,
      name: result.sourceName,
      playerId: result.organizerPlayerId,
      playerName: result.player.name,
      matchesPlayed: result.matchesWon + result.matchesLost + result.matchesDrawn,
      matchesWon: result.matchesWon,
      matchesLost: result.matchesLost,
      matchesDrawn: result.matchesDrawn,
      gamesWon: result.gamesWon,
      gamesLost: result.gamesLost,
      setsWon: result.setsWon,
      setsLost: result.setsLost,
      americanoPointsWon: result.americanoPointsWon,
      americanoPointsLost: result.americanoPointsLost,
      sourcePoints: result.sourcePoints,
      sourceFile: result.sourceFile,
      notes: result.notes
    })),
    revisions: row.revisions.map((revision) => ({
      number: revision.number,
      createdAt: revision.createdAt.toISOString(),
      actorName: revision.actorName,
      reason: revision.reason
    }))
  };
}
