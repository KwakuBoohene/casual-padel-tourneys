#!/bin/sh
set -eu
: "${PUBLIC_API_BASE_URL:?Set PUBLIC_API_BASE_URL to the API origin reachable by visitors}"
# JSON encoding prevents environment values from becoming executable browser content.
jq -n --slurpfile projectPolicy /etc/nginx/sentry-project-url-pattern.json \
  --arg projectUrl "${VIEWER_SENTRY_PROJECT_URL:-}" --arg dsn "${VIEWER_SENTRY_DSN:-}" \
  --arg environment "${VIEWER_SENTRY_ENVIRONMENT:-production}" \
  --arg release "${VIEWER_SENTRY_RELEASE:-}" \
  --arg rate "${VIEWER_SENTRY_TRACES_SAMPLE_RATE:-0.1}" --arg url "$PUBLIC_API_BASE_URL" '{apiBaseUrl: $url, sentryProjectUrl: ($projectUrl | gsub("^\\s+|\\s+$"; "") | if length <= 2048 and test($projectPolicy[0]) then . else "" end), sentry: {dsn: $dsn, environment: $environment, release: $release, tracesSampleRate: $rate}}' > /usr/share/nginx/html/runtime-config.json
