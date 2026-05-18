FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# Skip lifecycle scripts so @padel/api postinstall does not run prisma generate without schema.
RUN npm ci --ignore-scripts

FROM base AS build
COPY . .
RUN npm run build --workspace @padel/shared && npm run build --workspace @padel/web

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3005
CMD ["npm", "run", "start", "--workspace", "@padel/web"]
