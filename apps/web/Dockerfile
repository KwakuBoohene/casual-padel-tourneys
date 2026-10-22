FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY apps/mobile/package.json ./apps/mobile/package.json
COPY packages/shared/package.json ./packages/shared/package.json
# Install only the viewer/shared workspace dependencies and their build tooling.
RUN npm ci --ignore-scripts --include=dev --workspace @padel/web --workspace @padel/shared
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web
RUN npm run build --workspace @padel/shared && npm run build --workspace @padel/web

FROM nginx:stable-alpine
RUN apk add --no-cache jq
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/40-viewer-config.sh /docker-entrypoint.d/40-viewer-config.sh
RUN chmod +x /docker-entrypoint.d/40-viewer-config.sh
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 3005
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:3005/health || exit 1
