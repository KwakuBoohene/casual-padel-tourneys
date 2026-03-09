# Architecture

## System Overview

The platform has three user-facing surfaces and one shared engine:

- Organizer mobile app (`apps/mobile`) for setup and live control.
- API backend (`apps/api`) for tournament state, scheduling, scoring, and realtime.
- Public viewer web app (`apps/web`) for read-only live tournament views.
- Shared contracts package (`packages/shared`) for data consistency.

## Data Flow

1. Organizer creates tournament from mobile app.
2. API validates config and generates schedule.
3. API stores state, publishes realtime events.
4. Viewer web app fetches by share token and subscribes over WebSocket.
5. Organizer updates scores and controls, viewer updates instantly.

## Core Services

- **Scheduler engine**: fairness-first round and match generation.
- **Match engine**: score submission and leaderboard aggregation.
- **Control engine**: rename player, substitute player, adjust courts and recalc.
- **Viewer service**: public token and read-only endpoint.
- **Realtime service**: websocket fanout + optional Redis Pub/Sub broadcast.

## Deployment Topology

- Single VPS initially, all services in Docker:
  - `api`
  - `web`
  - `db` (PostgreSQL)
  - `redis`
  - `nginx`

Nginx routes:

- `api.yourdomain.com` -> API
- `app.yourdomain.com` -> Web viewer

## Scalability Path

- Split API, DB, and web to separate hosts when load increases.
- Keep shared package and API contracts stable for safe horizontal scale.
