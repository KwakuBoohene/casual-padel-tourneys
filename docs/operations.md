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

The deploy script lives on the server at `/home/circleci/deployment-scripts/` (not in this repo). It pulls `main`, rebuilds Compose images, runs `prisma migrate deploy` **inside the API container** against the Docker Postgres service, then recreates app containers.

```bash
/home/circleci/deployment-scripts/deploy-casual-padel.sh
```

## Database Migration

1. Create migration in API workspace.
2. Apply on staging.
3. Backup prod DB — **automatic**: the deploy script dumps and verifies before migrating (see Backup And Restore).
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
- `20260813150000_auth_email_foundation`: Email auth foundation
  - User `emailVerifiedAt` / `emailVerificationDueAt`
  - `MagicLinkToken` (hashed one-time tokens)
  - `OpaqueRecord` (password envelope storage; no hash column)

## Backup And Restore

### Automatic pre-migration backup

`deploy-casual-padel.sh` dumps the database **before it applies any migration** and aborts the
deploy if it cannot produce a verified dump. There is no manual step.

Each run writes two files to `BACKUP_DIR` (default `/home/circleci/db-backups`):

| File | Contents |
|------|----------|
| `padel-<UTC timestamp>.sql.gz` | Gzipped `pg_dump` (`--no-owner --no-privileges`) |
| `padel-<UTC timestamp>.info.txt` | Branch, commit, dump size, and per-table row counts taken **before** migrating |

A dump must pass three checks or the deploy stops: valid gzip, at least `BACKUP_MIN_BYTES`
(default 2000), and a real `PostgreSQL database dump` header. A dump that fails is renamed
`.REJECTED` rather than deleted, so it can still be examined, and cannot be mistaken for a good
backup. The newest `BACKUP_KEEP` (default 10) dumps are kept; older ones are pruned.

Overrides: `BACKUP_DIR`, `BACKUP_KEEP`, `BACKUP_MIN_BYTES`.

The `.info.txt` row counts are the fastest way to answer "did that migration lose data" — compare
them against the same query after the deploy:

```bash
docker compose exec -T db sh -c \
  'psql -qAtF= -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select relname, n_live_tup from pg_stat_user_tables order by relname"'
```

### Restoring

Restore into a **scratch database first** and check the row counts before touching the live one:

```bash
# 1. scratch database
docker compose exec -T db psql -U padel -d padel -c "CREATE DATABASE restore_check OWNER padel;"

# 2. restore the dump into it
gunzip -c /home/circleci/db-backups/padel-<stamp>.sql.gz \
  | docker compose exec -T db psql -U padel -d restore_check -q

# 3. compare row counts against the .info.txt taken with the dump
docker compose exec -T db psql -U padel -d restore_check -qAtF= \
  -c "select relname, n_live_tup from pg_stat_user_tables order by relname"
```

Only once that matches, replace the live database:

```bash
docker compose stop api web
docker compose exec -T db psql -U padel -d postgres -c "DROP DATABASE padel;"
docker compose exec -T db psql -U padel -d postgres -c "CREATE DATABASE padel OWNER padel;"
gunzip -c /home/circleci/db-backups/padel-<stamp>.sql.gz \
  | docker compose exec -T db psql -U padel -d padel -q
docker compose start api web
```

### A failed migration blocks every later deploy

Prisma refuses to apply anything once a migration is recorded as failed (`P3009`), even after the
migration file itself is fixed. Check with `prisma migrate status`; resolve with
`prisma migrate resolve --applied <name>` when the change is already present in the schema, or
`--rolled-back <name>` when it is not and should be retried. The deploy script already does this
for the King of the Court rename.

## Rollback

1. Roll back containers to previous image tags.
2. Restore database snapshot if schema/data incompatible.
3. Re-run smoke checks (`/health`, create tournament, submit score).

## Monitoring Baseline

- Use JSON logs for API.
- Add health checks for API and web.
- Integrate Sentry (later phase) for backend and web errors.
- Add uptime alerting for API and viewer domains.

## Email (Mailer)

Outbound mail uses a provider-agnostic `Mailer` (`apps/api/src/lib/mail`). Set:

| Variable | Purpose |
|----------|---------|
| `MAIL_PROVIDER` | `console` (log only — includes full message text / magic links) or `mailgun` |
| `MAIL_FROM` | From header, required for Mailgun |
| `MAILGUN_API_KEY` | Mailgun private API key |
| `MAILGUN_DOMAIN` | Sending domain |
| `MAILGUN_API_BASE_URL` | Optional; default `https://api.mailgun.net` (use `https://api.eu.mailgun.net` for EU) |
| `AUTH_MAGIC_LINK_BASE_URL` | Base URL/scheme for magic links (`?token=` appended); default `padel://auth/magic` |
| `OPAQUE_SERVER_SETUP` | Long-term password-auth server key from `npx @serenity-kit/opaque create-server-setup` |

In production, omit `MAIL_PROVIDER` or set `mailgun` and ensure key/domain/`MAIL_FROM` are set (factory fails closed otherwise). Changing `OPAQUE_SERVER_SETUP` invalidates all stored password credentials.

## Security Baseline

- Keep `.env` out of source control.
- Enforce HTTPS at Nginx (Certbot).
- Rate limit write endpoints.
- Use organizer authentication token/JWT for mutations.
- Install dependencies with `npm ci --ignore-scripts` (never `npm install` in CI/production); commit `package-lock.json` and review lockfile diffs on every dependency PR.
- Direct dependencies use exact versions in `package.json`; Dependabot opens weekly update PRs.
- Docker builds use `npm ci --ignore-scripts` and explicit `prisma generate` (no arbitrary package lifecycle scripts at install time).
