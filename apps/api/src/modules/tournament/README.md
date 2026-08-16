# Tournament module (Modular Hexagonal)

```text
http/            → Fastify adapters (validate → use-case → mapAppError)
application/     → use-cases + ports (TournamentRepository, TournamentEvents)
domain/          → pure aggregate mutations (no Prisma / Fastify / Redis)
infrastructure/  → Prisma repo + realtime adapter
```

**Dependency rule:** `http → application → domain/engine`; infrastructure implements ports; domain/engine never import Fastify/Prisma/ioredis.

KOH / auth modules land in epic-10. This module must not treat KOH hubs as Americano aggregates for live mutations (`getById` returns null for KOH).

## Career board credit

`submitScore` credits the organizer career board after a completed match is saved, through the
`CareerCredits` port (`infrastructure/PrismaCareerCredits.ts` → the organizerPlayers module's
`careerCredits.ts`). It is skipped when `config.contributeToCareerLeaderboard` is `false` or the
tournament has no owning organizer, and `domain/careerOutcome.ts` decides the winner side and
games from either a points scoreline or a completed Regular evaluation. Rules:
[`docs/career-leaderboard.md`](../../../../../docs/career-leaderboard.md).
