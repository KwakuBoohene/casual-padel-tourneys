# Tournament module (Modular Hexagonal)

```text
http/            → Fastify adapters (validate → use-case → mapAppError)
application/     → use-cases + ports (TournamentRepository, TournamentEvents)
domain/          → pure aggregate mutations (no Prisma / Fastify / Redis)
infrastructure/  → Prisma repo + realtime adapter
```

**Dependency rule:** `http → application → domain/engine`; infrastructure implements ports; domain/engine never import Fastify/Prisma/ioredis.

KOH / auth modules land in epic-10. This module must not treat KOH hubs as Americano aggregates for live mutations (`getById` returns null for KOH).
