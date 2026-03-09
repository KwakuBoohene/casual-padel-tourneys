# API Contracts

Base URL: `http://localhost:3001`

## Health

- `GET /health`

## Tournament Read

- `GET /tournaments`
- `GET /tournaments/:id`
- `GET /public/:token` (read-only viewer endpoint)

## Tournament Write

- `POST /tournaments`
  - body: create tournament config
- `POST /tournaments/score`
  - body: `tournamentId`, `matchId`, `scoreA`, `scoreB`, `expectedVersion`
- `POST /tournaments/rename-player`
  - body: `tournamentId`, `playerId`, `newName`
- `POST /tournaments/adjust-courts`
  - body: `tournamentId`, `courts`, `expectedVersion`
- `POST /tournaments/substitute-player`
  - body: `tournamentId`, `playerId`, `replacementName`

## Realtime

- `GET /ws/tournaments/:id` (websocket)

Events:

- `TOURNAMENT_CREATED`
- `SCORE_SUBMITTED`
- `PLAYER_RENAMED`
- `COURTS_ADJUSTED`
- `PLAYER_SUBSTITUTED`

## Concurrency

Mutating endpoints that can race (`score`, `adjust-courts`) require `expectedVersion`.
If mismatch occurs, API responds with conflict and caller must refresh state.
