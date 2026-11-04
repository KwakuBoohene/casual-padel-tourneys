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
- Applications run locally with native hot-reloading (tsx watch, Vite HMR)
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

Migration files are maintained in `apps/api/prisma/migrations/`. Use `prisma migrate status` to inspect the database's applied and pending migrations.

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
- Configure optional Sentry reporting and verify delivery; see activation below.
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


## Static viewer deployment

The viewer is a React + Vite SPA. Its Docker image serves only static files through Nginx
on port 3005; no Node.js process runs in the viewer container. The API, PostgreSQL and Redis
remain separate services. Existing `/tournament/:token`, `/tournament/:token/leaderboard`,
`/tournament/:token/rankings`, and `/c/:token?range=...` links are unchanged.

Set `PUBLIC_API_BASE_URL` to the API's **public HTTPS origin** in the viewer's deployment
environment. The container writes `/runtime-config.json` on startup, so changing the API
origin requires a container restart, not a frontend rebuild. `INTERNAL_API_BASE_URL` is no
longer used by the viewer. The API must be reachable from spectators' browsers; live updates
use its corresponding `wss://` WebSocket endpoint. Existing API CORS support allows these requests.

For local development, set `PUBLIC_API_BASE_URL=http://localhost:3004` in `apps/web/.env.local`
(or export it in your shell) and run `npm run dev --workspace @padel/web`. Match the port to
your running API. Localhost is allowed in development, but production requires a public origin.

Build with `npm run build --workspace @padel/shared` followed by
`npm run build --workspace @padel/web`. `npm run start --workspace @padel/web` previews the
build locally; production uses the Docker image/Nginx. For another static host, set
`PUBLIC_API_BASE_URL` during the build or supply `dist/runtime-config.json` containing
`{"apiBaseUrl":"https://api.example.com"}`. Serve configuration and HTML without caching,
cache hashed `/assets/` files, and rewrite frontend routes to `/index.html`.

Initial data loads in the browser; loading, unavailable-link and retryable network-error
states are displayed in the existing theme. Theme and standings-column preferences continue
to use the same browser storage/cookie keys. Per-tournament server-rendered HTML is no longer
provided. Build the image in CI and deploy the finished image to avoid build-time resource
spikes on a small shared server. `/health` provides the viewer container's health check.

## Sentry activation and alerts

Configure the API project DSN and verify error and trace delivery before relying on production monitoring. Hosted Sentry is optional; empty DSN leaves the SDK uninitialized. Console logs remain local.

1. Create/select a Node project in Sentry. Set API runtime `SENTRY_DSN`, `SENTRY_ENVIRONMENT=production`, `SENTRY_RELEASE` to the deployment revision, and `SENTRY_TRACES_SAMPLE_RATE=0.1` initially. Compose already loads `infra/.env`. Invalid sample rates disable tracing; zero retains errors without traces. Use staging separately.
2. Trigger a controlled failure in staging through a temporary protected test route and remove it afterward. Verify one issue, a request-duration trace, source stack locations, release and environment. Test fatal process failures only in a disposable staging instance.
3. Configure production-filtered Sentry issue alerts for new and regressed errors, a recipient/channel, and repeat limits. After establishing a baseline, add error-volume alerts. Send a test notification and verify receipt. These account/project settings have not been provisioned by repository changes.
4. Use Sentry issues for grouping, occurrence trends, regressions and affected users. Account IDs and request IDs are HMAC hashes using `JWT_SECRET`, never emails or raw identifiers. The same HMAC can correlate an account/local request log ID with Sentry; secret rotation changes identifiers.
5. Verify privacy before activation: arbitrary messages, request data, breadcrumbs and source context are stripped. Stack filenames and line numbers remain. This trades message detail for privacy. Request spans contain route templates and status only; SQL, Redis and distributed browser tracing are not included in this slice.
6. To disable reporting, clear the DSN and restart. Reporting outages must not fail successful tournament requests. Configure project retention and budgets in Sentry; proposed database telemetry retention is separate.


### CPA web browser monitoring

CPA web supports browser errors, unhandled rejections and API-request timing. This configuration applies to the web export; native monitoring is not enabled. Replay, DOM recording, navigation tracing and browser-to-API trace propagation are disabled. Expected API failures are server-owned; aborted requests are ignored and network failures are captured. Fetch/auth/cancellation behavior stays unchanged. Events contain no user identity; API Sentry events still provide hashed affected-user IDs. Error messages are replaced by safe labels, and stack filenames/line numbers remain. Configure private source-map uploads below to resolve original source locations.

Create/select a browser JavaScript project (for example `cpa-web`) and set these public build values:

```env
EXPO_PUBLIC_SENTRY_DSN=<browser project DSN>
EXPO_PUBLIC_SENTRY_ENVIRONMENT=production
EXPO_PUBLIC_SENTRY_RELEASE=<deployed revision>
EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
```

For local Expo export, set the variables before `npm run export:web --workspace @padel/mobile`. For Compose, put them in `infra/.env`; they are forwarded as Docker build arguments. For other Docker hosts, configure the same build arguments. Rebuild the mobile web image after changes: runtime environment changes alone do not update an exported JavaScript bundle. Never use a Sentry API/auth token in an `EXPO_PUBLIC_*` variable. Keep the API DSN on the API service.

Staging checklist: open CPA web, trigger a controlled render failure and confirm the retry fallback; test an unhandled rejection and network failure; verify sanitized events and sampled request traces in the browser project. Confirm expected 4xx/aborts stay quiet. Configure production issue alerts for this project and verify a test notification. Verify event delivery, fallback behavior and notification receipt in staging before enabling production monitoring.


### Public viewer monitoring

The Vite spectator viewer now reports browser/render failures, network/5xx/JSON load failures and sustained unexpected socket closes. Expected 4xx/expired shares, cancellation and intentional socket close are excluded. Repeated load/connection categories are limited to one report per minute. Anonymous diagnostics contain no identity, share URL, headers, bodies, breadcrumbs or player names; built asset filenames and line numbers survive. No replay, distributed trace propagation or original-source mapping is included yet.

Create/select a browser project such as `cpa-viewer` and set the viewer service runtime variables:

```env
VIEWER_SENTRY_DSN=<public viewer project DSN>
VIEWER_SENTRY_ENVIRONMENT=production
VIEWER_SENTRY_RELEASE=<deployed revision>
VIEWER_SENTRY_TRACES_SAMPLE_RATE=0.1
```

Compose already loads `infra/.env` into the viewer service. Recreate the viewer container after changing these values; its startup script writes JSON-encoded public settings into `runtime-config.json`. No image rebuild is required for Docker configuration changes. For local Vite or standalone static hosting, use the same variables in `apps/web/.env.local` before starting/building. Never put a Sentry API/auth token in these public settings. Existing API and CPA web DSNs are separate settings. Empty viewer DSN disables SDK initialization; initial config-download failures cannot report because the DSN has not loaded yet.

Set a production-only issue alert and verify a controlled staging event, request trace and notification receipt. Verify live match rendering and Sentry delivery in staging. Configure private source-map uploads below to resolve original source locations.

### Private web source maps without release tagging

Both browser builds now generate external maps and inject debug IDs. Debug IDs match each JavaScript bundle to its map; named releases are not required. The privacy filters preserve only validated debug IDs and their normalized bundle filenames, not full page URLs or identities. The CLI uploads the exact bundle/map pair before the map files and `sourceMappingURL` comments are removed from the served directory. The viewer also denies `.map` requests in Nginx. No release tags are generated and existing optional release variables can stay empty.

Uploads require one-time deployment configuration:

1. In Sentry, obtain the organization slug and the existing CPA web/public viewer project slugs. Create a private organization auth token permitted to upload source maps (`org:ci`). A project DSN cannot authenticate uploads. See [Sentry token scopes](https://docs.sentry.io/api/permissions/).
2. Set nonsecret build settings in `infra/.env`:

   ```env
   SENTRY_ORG=your-org-slug
   SENTRY_VIEWER_PROJECT=your-public-viewer-project
   SENTRY_ORGANIZER_PROJECT=your-cpa-web-project
   ```

3. Provide `SENTRY_AUTH_TOKEN` as a secret in the deploying shell/CI. Do not put it in `infra/.env`: that file is loaded into running services. Do not use `VIEWER_*`, `VITE_*` or `EXPO_PUBLIC_*` for the upload token.
4. Build with the secret override, from the `infra` directory:

   ```sh
   docker compose -f docker-compose.yml -f docker-compose.sentry.yml build web mobile
   docker compose up -d --no-deps web mobile
   ```

   The override mounts the token only during image builds using BuildKit secrets, not build arguments or runtime environment variables. For another Docker build host, supply the secret as ID `sentry_auth_token` and pass `SENTRY_ORG` and the appropriate `SENTRY_PROJECT` as build args. Configure the deployment script to use this build override when the private upload token is supplied.

For local builds or a CI workflow that deploys the resulting static artifacts, export `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` and `SENTRY_PROJECT`, then run the usual viewer build or CPA `export:web`. Do not upload maps from an unrelated CI build and then rebuild different JavaScript for production. The deployed files must be the same files processed and uploaded by the build step. The repository CI validates both builds offline; production uploads occur in the actual image build.

With all upload settings absent, builds run offline, inject IDs and remove private maps; error reporting still works but source resolution is unavailable. Partial settings or failed uploads stop the build and clean up maps. To turn uploads off, remove all upload settings together. Existing uploaded maps are retained in Sentry so older open pages can still resolve; do not manually remove old artifacts on each deployment.

After configuring credentials, rebuild and trigger a controlled browser error in staging for each frontend. Confirm Sentry shows the original `.ts`/`.tsx` location rather than a minified bundle, and confirm `.map` files are not downloadable from either site. Verify authenticated uploads and Sentry source resolution after configuring the deployment credentials. Backend/native source maps are outside this browser-build slice.

## Padel viewer platform admin access

The private `/admin` portal is in the Vite Padel viewer (`apps/web`), not the Expo organizer. The organizer has no admin routes or menu entry. Reporting screens arrive separately. Access still requires a persisted, verified, non-guest user with an active `PlatformAdminGrant`; organizer ownership, manager membership and JWT claims never grant platform privileges.

Deploy the additive migration first. With trusted operator/database access, identify the exact existing user ID, verify the person's identity/email verification, and grant or revoke access:

```sh
npm run admin --workspace @padel/api -- grant <user-id>
npm run admin --workspace @padel/api -- revoke <user-id>
# On the deployed Compose stack:
docker compose exec -T api npm run admin:production --workspace @padel/api -- grant <user-id>
docker compose exec -T api npm run admin:production --workspace @padel/api -- revoke <user-id>
```

Set these API runtime variables and restart/recreate the API:

```env
ADMIN_PORTAL_ENABLED=true
ADMIN_WEB_BASE_URL=https://your-padel-viewer-origin
```

`ADMIN_WEB_BASE_URL` must be an HTTPS origin with no credentials, path, query or fragment. Loopback HTTP is allowed only outside production. The server constructs `/admin/sign-in#token=...`; callers cannot supply a redirect URL. Do not change the organizer's `AUTH_MAGIC_LINK_BASE_URL`. Existing mail-provider configuration delivers the admin sign-in email. Production remains disabled until the flag is explicitly enabled; a wrong/missing origin fails delivery without exposing account existence.

Visit `<viewer origin>/admin`. The viewer offers email magic-link sign-in for existing accounts. `/admin/sign-in` email requests are rate-limited and always return the same accepted-email message, including for missing/unverified/guest/ungranted accounts or a disabled portal. No accounts are created. Eligible accounts receive a single-use 15-minute LOGIN token through the existing hashed token store. The browser removes the fragment before configuration loading, diagnostics and rendering, consumes it through the existing authentication endpoint, and checks `/admin/access` before displaying the shell. Expired/replayed links require a fresh link. Email scanners do not consume the token merely by requesting the page, because the token is in a fragment.

The admin bearer session stays in memory and the viewer tab's sessionStorage, separate from organizer storage. Public viewer requests never receive its Authorization header. Closing the tab ends its stored session. On every private admin request, the server checks persisted access and records an audit before returning data; all admin responses are no-store. Viewer `/admin` pages also use no-referrer/no-store hosting headers. The viewer rechecks on focus, visibility and periodically; denial/sign-out clears session access and unmounts private content, and stale responses are discarded. Revocation takes effect at the next server authorization check; a request already authorized may finish.

There is no grant-management HTTP endpoint. Grant/revoke commands are transactional and audited as operator actions (null actor, target user ID). Grants cascade on user deletion; audit history retains IDs. Admin read audits contain only actor ID, route template, timestamp and bounded request ID, never search text or response bodies. Database/audit failures fail closed. New admin reporting endpoints must use the same guarded registration.

Retain audit rows for 12 months. Schedule the following bounded command hourly in the deployment host's maintenance scheduler; each invocation removes at most 1,000 expired rows. No host schedule is installed by this change:

```sh
docker compose exec -T api npm run admin:production --workspace @padel/api -- prune
```

To disable access, set the flag false and restart the API. Operator revoke/prune commands remain available while disabled; do not drop grant/audit tables as a routine rollback. Production migration, real-account bootstrap and actual email delivery require deployment verification.

### Admin reporting APIs

Apply the additive reporting-index migration through the normal migration procedure before deploying admin reporting changes. Existing admin runtime configuration remains sufficient.

## Organizer usage reporting

Apply database migrations before enabling usage reporting. `USAGE_BUSINESS_ENABLED=true` on the API records successful account creation/conversion, sign-ins and organizer audit actions. `USAGE_VISITS_ENABLED=true` permits optional signed-in organizer screen visits; rebuild the organizer with `EXPO_PUBLIC_USAGE_VISITS_ENABLED=true` to expose the per-device opt-in control. All three flags default off. The public viewer sends no visit events. Turning off the device control cancels queued visit delivery; operational business observations have a separate server flag.

Admin usage/activity reports use the existing admin grant and `ADMIN_PORTAL_ENABLED` checks. Visits are foreground screen transitions, not requests, background refreshes or sessions. A visit session expires after 30 minutes without foreground interaction; account switches rotate it. Cross-tab session coordination requires Web Locks and working local storage; optional visits fail closed where these are unavailable. Do not use observed active-account counts as a complete census of usage.

Raw usage events retain opaque actor/owner/target references for 90 days. Anonymous daily counts retain no identities or session IDs and expire after 13 calendar months; admin read audits expire after 12 months. Reports label partial collection and retention gaps, and never reconstruct pre-collection or deleted history. Daily visit trends use full Africa/Accra calendar days, while exact metrics and activity filters use inclusive `from`/exclusive `to` timestamps. Device opt-out stops future visits and does not remove prior retained observations.

The Compose `usage-maintenance` service runs bounded cleanup hourly. When deploying services separately, schedule this command hourly against the API container instead:

```bash
npm run maintenance:prune-usage --workspace @padel/api
```

Monitor command failures and database growth. Collection flags stop new observations without deleting existing reports. Database migrations and collection flags must be rolled out before enabling the organizer build flag.
