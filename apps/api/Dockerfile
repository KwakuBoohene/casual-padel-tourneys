FROM node:22-alpine AS base
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN npm install

FROM base AS build
# OpenSSL for Prisma on Alpine
RUN apk add --no-cache openssl
COPY . .
# Generate Prisma client for container runtime (linux-musl-arm64), not host.
# Dummy DATABASE_URL only needed for generate; runtime uses real env.
ENV DATABASE_URL="postgresql://local:local@localhost:5432/local"
RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace @padel/shared && npm run build --workspace @padel/api

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3004
CMD ["npm", "run", "start", "--workspace", "@padel/api"]
