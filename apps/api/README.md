# `@padel/api`

Fastify + Prisma API for Casual Padel Tourneys. Owns tournament lifecycle (Americano / Mexicano / Regular), auth, King of the Hill (KOH), and realtime scoreboard updates.

Package name: `@padel/api` · default port: `3001` (`API_PORT`)

## Quick start

From the monorepo root (Postgres + Redis via `infra/docker-compose.yml`):

```bash
# Infra (Postgres :5432, Redis :6379)
docker compose -f infra/docker-compose.yml up -d db redis

# Env: apps/api/.env (DATABASE_URL, REDIS_URL, JWT_SECRET, …)
npm run db:migrate --workspace @padel/api
npm run dev --workspace @padel/api
```

Useful scripts (from `apps/api` or via `--workspace @padel/api`):

| Script | Purpose |
|--------|---------|
| `dev` | `tsx watch` on `src/server.ts` |
| `build` / `start` | Compile + run `dist` |
| `test` | Node test runner over `tests/**/*.test.ts` |
| `db:migrate` / `db:generate` / `db:push` | Prisma |
| `simulate` | Engine simulation helper |

Health: `GET /health` → `{ ok: true }`.

## Architecture overview

The API is moving to **modular hexagonal + light DDD** (epic-09). Americano / Mexicano / Regular tournaments already live in that shape; KOH and most auth still use classic Fastify route modules (epic-10).

```text
HTTP (Fastify)  →  application use-cases  →  domain / pure engines
                         ↓ ports
              infrastructure (Prisma, Redis/WS)
```

**Dependency rule (non-negotiable for modular code):**

- `http` → `application` → `domain` / `engine`
- `infrastructure` implements application **ports**
- `domain` / `engine` never import Fastify, Prisma, or ioredis

Longer rationale: [`plans/implementation/backend/epic-09-api-modular-hexagonal/adr-modular-hexagonal.md`](../../plans/implementation/backend/epic-09-api-modular-hexagonal/adr-modular-hexagonal.md).

### Request flow (tournament module)

1. Fastify route in `modules/tournament/http/` validates input and auth headers.
2. Calls an application use-case (e.g. `createTournament`, `submitScore`).
3. Use-case loads/saves via `TournamentRepository` (Prisma adapter) and mutates via pure `domain/` + `engine/` helpers.
4. Side effects (WS fan-out) go through `TournamentEvents` (realtime adapter).
5. Failures use shared `AppError` → `mapAppError` for HTTP status/body.

**Source of truth for live AM/MX/Regular state is Postgres** (optimistic locking via `version`). Redis is for pub/sub fan-out only, not the tournament store.

## File structure

```text
apps/api/
├── prisma/                 # schema + migrations (Postgres)
├── src/
│   ├── server.ts           # listen + boot
│   ├── app.ts              # Fastify plugins, module registration
│   ├── modules/
│   │   ├── tournament/     # hexagonal tournament bounded context
│   │   │   ├── http/       # Fastify adapters + register()
│   │   │   ├── application/# use-cases + ports
│   │   │   ├── domain/     # aggregate mutations (pure)
│   │   │   └── infrastructure/  # Prisma repo, realtime adapter, mappers
│   │   └── koh/            # King of the Hill bounded context (same four layers)
│   ├── shared/
│   │   ├── kernel/         # AppError, Result helpers
│   │   └── http/           # mapAppError
│   ├── engine/             # pure schedulers / scoring (Americano, Mexicano, Regular, KOH math)
│   ├── realtime/           # WebSocket hub + Redis pub/sub
│   ├── routes/             # legacy-style modules (mePlayers)
│   ├── lib/                # auth shim, mail, prisma client, logger; store.ts = test harness only
│   └── types/
└── tests/                  # mirrors src/ (do not put *.test.ts under src/)
```

Module-local notes: [`src/modules/tournament/README.md`](./src/modules/tournament/README.md), [`src/modules/koh/README.md`](./src/modules/koh/README.md), [`src/modules/auth/README.md`](./src/modules/auth/README.md).  
Test layout: [`tests/README.md`](./tests/README.md).

### What lives where

| Area | Location | Notes |
|------|----------|--------|
| Create / score / live AM·MX·Regular | `modules/tournament/` | Prefer this path for new tournament work |
| Pairing & scoring algorithms | `engine/` | Keep pure; call from application/domain |
| KOH hubs & queues | `modules/koh/` | Hexagonal; `POST /tournaments` + public token reads branch in from the tournament module |
| Auth (guest, Google, password, magic link, reset, attach) | `modules/auth/` | Hexagonal; JWT + OPAQUE behind adapters. `lib/auth.ts` re-exports the preHandlers |
| Organizer saved players | `routes/mePlayers.ts` | Authenticated `/me/players` |
| Realtime subscriptions | `realtime/socketHub.ts` | Clients subscribe by public share token |

## HTTP surface (high level)

Auth headers commonly used:

- `Authorization: Bearer <jwt>` — organizer session
- `x-organizer-token` — tournament organizer secret (share with care)
- `x-public-token` — public viewer token (read / limited write where allowed)

Typical tournament routes (registered by `registerTournamentModule`):

- `POST /tournaments` — create (Americano / Mexicano / Regular)
- `GET /tournaments/:id` — organizer read
- `GET /public/tournaments/:publicToken` — viewer snapshot
- Score / advance / regenerate / player mutations — under the tournament module HTTP adapters

KOH routes (`/koh/tournaments/...`) are registered by `registerKohModule` from `modules/koh/http/`. Auth routes (`/auth/...`) are registered by `registerAuthModule` from `modules/auth/http/`. Prefer reading the route files or OpenAPI-ish comments there for exact paths and bodies.

## Realtime

- Clients connect via WebSocket (Fastify `@fastify/websocket`).
- Hub loads tournament access from **Prisma** (public token → tournament), then fans out scoreboard updates.
- Optional `REDIS_URL`: cross-process pub/sub. Without Redis, in-process subscriptions still work for a single API instance.

## Configuration

Common env vars (see also repo root / `infra` docs):

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Postgres (required for persist) |
| `REDIS_URL` | Realtime pub/sub (optional but recommended) |
| `API_PORT` | Listen port (default `3001`) |
| `API_LOG_LEVEL` | Fastify / app log level |
| `JWT_SECRET` | Session tokens |
| Mail / OAuth vars | Magic link + Google (see `lib/mail`, auth routes) |

## Testing

```bash
npm test --workspace @padel/api
```

- Place tests in `tests/` with the same relative path as `src/` (workspace rule).
- Tournament use-case / HTTP tests target the modular stack.
- `lib/store.ts` remains a **test harness** wrapping domain helpers — not the production live store.

## Extending the API

**New Americano/Mexicano/Regular behavior**

1. Add or extend pure logic in `engine/` or `modules/tournament/domain/`.
2. Add a use-case under `application/`.
3. Wire ports if you need new persistence or events.
4. Keep HTTP adapters thin: validate → use-case → `mapAppError`.

**New bounded context (KOH, auth, …)**

Follow the same `modules/<name>/{domain,application,infrastructure,http}` layout when extracting from `routes/` (see epic-10 plans).

**Do not**

- Put business rules in Fastify handlers.
- Import Prisma/Fastify inside `domain/` or `engine/`.
- Reintroduce an in-memory `Map` as source of truth for live tournaments.

## Related docs

- Architecture ADR: `plans/implementation/backend/epic-09-api-modular-hexagonal/adr-modular-hexagonal.md`
- Backend epics: `plans/implementation/backend/`
- Shared types: `packages/shared`
