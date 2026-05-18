# Operations Runbook

## Development Workflow

Run database and Redis in Docker; run applications locally using npm scripts. This provides the best performance on macOS with hot-reloading.

**Setup:**

```bash
# First time setup
cp infra/.env.example infra/.env
# Edit infra/.env with your configuration

# Start ONLY database and Redis (no application containers)
cd infra
docker compose up -d db redis

# In project root, install dependencies from lockfile
cd ..
npm ci --ignore-scripts
npm run db:generate
npm run db:migrate

# Run applications locally
npm run dev:core    # Run API and web only
npm run dev         # Run API, web, and mobile
```

**How it works:**

- Specifying `db redis` tells Docker Compose to start only those services
- Applications run locally with native hot-reloading (tsx watch, Next.js HMR)
- Applications access database on `localhost:5400` and Redis on `localhost:6579`

**Database operations:**

```bash
# Since apps run locally, use npm scripts directly
npm run db:migrate
npm run db:generate

# Access database
cd infra
docker compose exec db psql -U padel -d padel
```

**Stopping services:**

```bash
cd infra
docker compose down
```

## Local Deployment (Legacy)

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d db redis
npm ci --ignore-scripts
npm run db:generate
npm run db:migrate
npm run dev
```

## Production Deployment (Single VPS)

```bash
git pull
docker compose -f infra/docker-compose.yml up -d --build
```

## Database Migration

1. Create migration in API workspace.
2. Apply on staging.
3. Backup prod DB.
4. Apply migration on production.
5. Verify API health and round generation.

### Current Migrations

- `0001_init`: Initial schema (Tournament, Player, Round, Match)
- `20260312112022`: Schema updates
- `20260312130752_add_user_and_organizer`: User authentication and organizer relation
- `20260313105650_add_scheduling_mode`: Scheduling mode variants
- `20260316000000_add_guest_support`: Guest access support
- `20260503000000_add_player_integration_support`: Player integration feature
  - Adds `PendingPlayer` table for mid-tournament player additions
  - Extends `Player` table with gender, handicap, integrationWave, integratedAt fields
  - Extends `Tournament` table with integrationWaveCount, enableAutoIntegration, integrationThreshold
  - Creates indexes for performance optimization

## Backup And Restore

Backup:

```bash
docker exec -t <postgres_container> pg_dump -U padel -d padel > backup.sql
```

Restore:

```bash
cat backup.sql | docker exec -i <postgres_container> psql -U padel -d padel
```

## Rollback

1. Roll back containers to previous image tags.
2. Restore database snapshot if schema/data incompatible.
3. Re-run smoke checks (`/health`, create tournament, submit score).

## Monitoring Baseline

- Use JSON logs for API.
- Add health checks for API and web.
- Integrate Sentry (later phase) for backend and web errors.
- Add uptime alerting for API and viewer domains.

## Security Baseline

- Keep `.env` out of source control.
- Enforce HTTPS at Nginx (Certbot).
- Rate limit write endpoints.
- Use organizer authentication token/JWT for mutations.
- Install dependencies with `npm ci --ignore-scripts` (never `npm install` in CI/production); commit `package-lock.json` and review lockfile diffs on every dependency PR.
- Direct dependencies use exact versions in `package.json`; Dependabot opens weekly update PRs.
- Docker builds use `npm ci --ignore-scripts` and explicit `prisma generate` (no arbitrary package lifecycle scripts at install time).
