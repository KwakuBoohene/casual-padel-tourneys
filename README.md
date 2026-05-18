# Casual Padel Tourneys

Self-hosted, mobile-first platform for running Padel Americano and Mexicano tournaments with fairness-first scheduling, live controls, and a public viewer.

## Key Features

- **Fairness-first scheduling**: Advanced constraint solver for equal games and minimal repeated pairings
- **Tournament modes**: Americano (successive challenge) and Mexicano (point-based dynamic)
- **Tournament variants**: Classic, Mixed (gender-balanced), Team
- **Scheduling modes**: Target games per player, total time, or round-robin
- **Live controls**: Submit scores, rename players, adjust courts mid-tournament
- **Player integration**: Add late-arriving players during active tournaments with handicap weighting
- **Real-time updates**: WebSocket + Redis pub/sub for instant viewer synchronization
- **Public viewer**: Share tournaments via token for read-only spectator access
- **Mobile organizer app**: React Native app for on-site tournament management

## Monorepo Structure

- `apps/api`: Fastify backend, scheduling engine, websocket events.
- `apps/web`: Next.js public viewer portal.
- `apps/mobile`: Expo React Native organizer app.
- `packages/shared`: shared tournament types and Zod schemas.
- `infra`: Docker Compose and Nginx reverse proxy.
- `docs`: architecture, scheduling, API, and operations docs.

## Tech Stack

- Backend: Node.js + TypeScript + Fastify + Prisma + PostgreSQL + Redis
- Web viewer: Next.js
- Mobile organizer: React Native (Expo)
- Realtime: WebSocket + Redis Pub/Sub
- Infra: Docker Compose + Nginx

## Quick Start

1. Copy environment variables:

```bash
cp .env.example .env
```

2. Install dependencies (uses lockfile; skips install scripts — run `npm run db:generate` after):

```bash
npm ci --ignore-scripts
npm run db:generate
```

3. Start local API + web + infra:

```bash
docker compose -f infra/docker-compose.yml up -d db redis
npm run dev
```

4. Open apps:

- API: `http://localhost:3001/health`
- Web viewer: `http://localhost:3000`
- Mobile: `npm run dev --workspace @padel/mobile`

## Key Scripts

- `npm run dev`: run all workspace dev scripts
- `npm run build`: build all workspaces
- `npm run lint`: static checks across workspaces
- `npm run typecheck`: TypeScript no-emit checks
- `npm run test`: unit/integration tests
- `npm run simulate`: run fairness simulation (1,000 tournaments)
- `npm run db:generate`: generate Prisma client
- `npm run db:migrate`: apply Prisma migrations

## Environment Variables

See `.env.example`:

- `DATABASE_URL`: Postgres connection string
- `REDIS_URL`: Redis connection string
- `API_PORT`: backend port
- `WEB_PORT`: web port
- `PUBLIC_API_BASE_URL`: API origin consumed by web
- `JWT_SECRET`: organizer auth secret

## Standard Engineering Concepts Included

- Strict TypeScript in all packages
- Shared contracts and validation schemas
- Fairness simulation tests for scheduling quality
- API integration tests
- Version-based optimistic concurrency checks
- Rate limiting and input validation
- CI pipeline for lint/typecheck/test/build
- Dockerized deployment baseline
- Operational docs (migrations, backup, rollback)

## Documentation

- `docs/architecture.md` - System architecture and deployment topology
- `docs/scheduling.md` - Scheduling engine and fairness algorithms
- `docs/api.md` - REST API endpoints and WebSocket events
- `docs/operations.md` - Deployment, migrations, backup/restore procedures
- `docs/player-integration-feature.md` - Player integration feature documentation
