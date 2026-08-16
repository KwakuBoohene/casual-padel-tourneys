# KOH module (Modular Hexagonal)

King of the Hill nights: courts hold a queue of doubles units, the king stays while
challengers rotate, and promotion rules move units between courts.

```text
http/            → Fastify adapters (validate → use-case → mapKohError)
application/     → use-cases + ports (KohRepository, KohEvents)
domain/          → hub projection types + pure helpers (balanceHint)
infrastructure/  → Prisma ops/mappers + realtime adapter
```

**Dependency rule:** `http → application → domain/engine`; infrastructure implements ports;
`domain/` and `engine/koh/` never import Fastify, Prisma, or ioredis.

## Layout notes

- `infrastructure/ops/**` holds the Prisma operations previously in `lib/kohStore.ts`.
  `PrismaKohRepository` is a thin façade over them so the port stays the only seam.
- `infrastructure/mappers/**` owns row → hub / rankings / engine-court projections.
- Error contract: `notFound` only for a missing or non-owned KOH night (404); other
  failures are `validation` (400) and version conflicts are `conflict` with
  `{ expectedVersion, actualVersion }` details that `mapKohError` puts in the 409 body.

## Routes owned elsewhere

| Route | Owner | Entry point |
|-------|-------|-------------|
| `POST /tournaments` (KOH mode) | tournament `createRoutes` | `http/createKoh.ts` |
| `GET /tournaments/:id` (KOH hub) | tournament `queryRoutes` | `application/readKohHub.ts` |
| `GET /public/:token[/rankings]` | tournament `queryRoutes` | `application/readKohHub.ts` |

Organizer-player crediting still comes from `lib/organizerPlayers.ts` until epic-10 ticket 06
moves it into its own module.
