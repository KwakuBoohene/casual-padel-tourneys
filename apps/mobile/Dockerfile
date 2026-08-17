# Build stage: produce static web export
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/shared/package.json ./packages/shared/
# Skip lifecycle scripts so @padel/api postinstall does not run prisma generate without schema.
RUN npm install --ignore-scripts

FROM base AS build
COPY . .
RUN npm run build --workspace @padel/shared
RUN npm run export:web --workspace @padel/mobile

# Serve stage: only static files + serve
FROM node:22-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/apps/mobile/dist ./dist
EXPOSE 8081
# -s rewrites unknown paths (e.g. /auth/magic?token=) to index.html so Expo Router can redeem email links.
CMD ["serve", "dist", "-s", "-l", "8081"]
