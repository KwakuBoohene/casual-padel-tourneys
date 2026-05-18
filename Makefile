install:
	npm ci --ignore-scripts
	npm run db:generate

dev:
	npm run dev

build:
	npm run build

test:
	npm run test

lint:
	npm run lint

typecheck:
	npm run typecheck

simulate:
	npm run simulate

db-generate:
	npm run db:generate

db-migrate:
	npm run db:migrate

db-services-up:
	cd infra && docker compose up db redis

db-services-down:
	cd infra && docker compose down