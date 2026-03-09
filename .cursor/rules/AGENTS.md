
## Padel Americano Tournament App
Overview

This project is a mobile-first system for organizing and running Padel Americano and Mexicano tournaments. The platform will allow organizers to quickly generate match rotations, track scores, and share live tournament progress with spectators.

The goal is to build a simple but powerful scheduling engine that prioritizes the key principle of Americano tournaments:

Players should play roughly the same number of matches, not necessarily play against every other player.

The platform will consist of:

Mobile App (for organizers running the tournament courtside)

Backend API (scheduling engine, tournament state, sharing)

Web Viewer Portal (live scoreboard and match view)

Development will happen incrementally in clearly defined chunks, with a code review checkpoint after each feature before continuing.

Core Features
Tournament Types

The app must support:

Americano

Classic Americano

Mixed Americano

Team Americano

Mexicano

Classic Mexicano

Mixed Mexicano

Team Mexicano

Functional Requirements
1. Tournament Configuration

Users must be able to configure:

Number of players

Number of courts

Points per match

Number of games per player OR time estimate (focus on every player playing the same numnber of games and not on every player playing every other person)

Tournament type (Americano / Mexicano variants)

The system should compute:

Number of rounds

Player rotations

Estimated tournament duration

Estimated number of matches per player

2. Flexible Rotation Engine

The rotation engine must:

Ensure players play roughly equal number of matches

Avoid repeated pairings where possible

Adjust when courts change mid-tournament

Constraints include:

Number of courts

Number of players

Target games per player

Points per game

3. Live Tournament Controls

During a tournament the organizer must be able to:

Change player names

Adjust court count

Recalculate remaining games

Update scores

Progress rounds

Changes should not break the tournament structure.

4. Dynamic Court Scaling

If a new court becomes available mid-tournament:

The system should:

Recalculate remaining rotations

Distribute players across new courts

Maintain fairness of play counts

5. Score Tracking

For each match:

Track team scores

Aggregate player totals

Maintain live leaderboard

6. Shareable Viewer Link

Each tournament generates a:

Public share link

Viewers can see:

Current round

Court assignments

Match scores

Leaderboard

Upcoming matches

Viewer mode is read-only.

7. Natural Language Tournament Creation (Nice to Have)

Users can describe a tournament like:

“Create a mixed americano for 12 players on 3 courts to 24 points.”

The system converts it into a structured configuration.

This feature should be implemented last.

Additional Recommended Features
Player Substitution

Replace a player mid tournament.

Tournament Templates

Save reusable tournament setups.

Offline Mode

Organizer can run tournaments without internet.

Export Results

Export results to:

PDF

CSV

Shareable image

Match Timer

Optional timer for match duration.

# Infrastructure & Tech Stack (Self-Hosted VPS)

The entire system will be hosted on a **single Virtual Private Server (VPS)** initially, with the option to split services later if scaling is needed.

The VPS will host:

* Backend API
* PostgreSQL database
* Web viewer application
* Realtime service
* Reverse proxy

All services will run in **Docker containers** for portability and deployment consistency.

---

# Server Stack

## Containerization

**Docker + Docker Compose**

Reasons:

* Simple deployment
* Easy service orchestration
* Environment isolation
* Portable between servers

Services:

```
backend
web
database
redis
nginx
```

---

# Backend

**Runtime**

Node.js (LTS)

**Language**

TypeScript

**Framework**

Fastify

Reasons:

* Much faster than Express
* Built-in schema validation
* Excellent TypeScript support

---

## API Layer

Either of these options are acceptable:

Preferred:

**tRPC**

Benefits:

* End-to-end types
* Excellent with React/React Native

Alternative:

**REST API**

---

# Database

**Primary Database**

PostgreSQL

Reasons:

* Excellent relational modeling
* Reliable
* Ideal for scheduling queries

---

## ORM

**Prisma**

Benefits:

* Strong TypeScript support
* Migration system
* Easy schema management

---

# Realtime Layer

For live tournament updates:

**WebSockets**

Implementation:

* Fastify WebSocket plugin
* Socket.IO (optional)

---

# Caching / State

**Redis**

Used for:

* Live match state
* Tournament session caching
* Pub/Sub for realtime updates

---

# Web Viewer Portal

Framework:

**Next.js**

Mode:

```
next build
next start
```

Runs as a **Node server inside Docker**, not on Vercel.

Responsibilities:

* Public tournament pages
* Scoreboards
* Court assignments
* Live updates

---

# Mobile App

Framework:

**React Native (Expo)**

Build strategy:

* Expo development
* Later eject to bare workflow if needed

Communicates with:

```
https://api.yourdomain.com
```

---

# Reverse Proxy

**Nginx**

Handles:

* HTTPS termination
* Routing
* Static caching
* WebSocket upgrades

Example routing:

```
api.yourdomain.com  -> backend
app.yourdomain.com  -> nextjs web viewer
```

---

# Deployment

Deployment will be done via:

**Docker Compose**

Example service layout:

```
padel-app/
  docker-compose.yml
  backend/
  web/
  nginx/
  postgres/
```

---

# Example Architecture

```
Mobile App (Expo)
        |
        v
     Nginx
        |
  -----------------
  |               |
Backend API     Web Viewer
(Fastify)       (Next.js)
  |               |
  -------Redis-----
        |
     Postgres
```

---

# CI / CD (Optional but Recommended)

CI:

**GitHub Actions**

Tasks:

* Run tests
* Build Docker images

Deployment:

```
git pull
docker compose up -d --build
```

---

# Monitoring (Later Phase)

Recommended additions:

* **Prometheus**
* **Grafana**
* **Sentry**

---

# Security

The VPS must include:

* UFW firewall
* Fail2Ban
* HTTPS via Let's Encrypt (Certbot)
* Environment variables stored in `.env`

---

# Scalability Plan

Initially:

```
Single VPS
```

If growth happens:

Split into:

```
VPS 1 → API
VPS 2 → Database
VPS 3 → Web
```

---

# Important Hosting Principle

The system should always remain **fully self-hostable**.

No dependency should require:

* Vercel
* Supabase
* Firebase
* managed cloud databases
---
Core Modules
1. Tournament Engine

Responsible for:

Player rotations

Court allocations

Match generation

Constraint satisfaction

This is the most complex part of the system.

2. Match Engine

Responsible for:

Score tracking

Leaderboards

Rankings

3. Scheduling Engine

Handles:

Fair play distribution

Court assignment

Time estimation

4. Viewer Service

Handles:

Shareable link generation

Public match state

Realtime updates

Development Workflow

This project will be built in incremental chunks.

After each chunk is completed, development must pause so the project owner can:

Review the code

Suggest changes

Approve the implementation

Only after approval should the next chunk begin.

Development Phases
Phase 1 — Project Setup

Deliverables:

Monorepo setup

Backend API skeleton

Mobile app skeleton

Web viewer skeleton

Shared types

Phase 2 — Tournament Data Model

Implement:

Player

Tournament

Match

Round

Court

Phase 3 — Americano Rotation Engine

Implement:

Basic classic Americano

Court assignments

Player rotations

Phase 4 — Score Tracking

Implement:

Match score entry

Leaderboard generation

Player stats

Phase 5 — Live Tournament Controls

Implement:

Rename players

Adjust courts

Recalculate rotations

Phase 6 — Viewer Portal

Implement:

Public link

Live scoreboard

Match viewer

Phase 7 — Mexicano Formats

Add support for:

Classic Mexicano

Mixed Mexicano

Team Mexicano

Phase 8 — Time Estimation Engine

Add:

Tournament duration estimate

Game count estimates

Phase 9 — Natural Language Tournament Builder

Example input:

“12 players mixed americano on 3 courts to 24 points”

Output:

Structured tournament configuration.

Coding Standards

Language:

TypeScript everywhere

Rules:

Strict typing

Small functions

Pure scheduling engine logic

High unit test coverage for scheduling

Testing

Testing must include:

Unit tests for scheduling engine

Integration tests for API

Simulation tests for tournament fairness

Version Control

Branch model:

main
develop
feature/*

Every feature must be implemented in a separate branch.

Definition of Done

A feature is considered complete when:

Code compiles

Tests pass

Feature works end-to-end

Code is reviewed and approved

Important Principles
Fair Play Over Perfect Rotation

The goal is:

Equal number of matches per player

NOT:

Every player plays every other player
Mid Tournament Flexibility

The system must tolerate:

Player name changes

Court number changes

Player substitutions

Without breaking the tournament.

AI Agent Instructions

AI agents working on this project must:

Implement one feature at a time

Provide complete code for review

Stop after the feature is implemented

Wait for human approval before continuing