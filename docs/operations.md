# Operations Runbook

## Local Deployment

```bash
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d db redis
npm install
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
