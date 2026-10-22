#!/bin/sh
set -eu
: "${PUBLIC_API_BASE_URL:?Set PUBLIC_API_BASE_URL to the API origin reachable by visitors}"
# JSON encoding prevents environment values from becoming executable browser content.
jq -n --arg url "$PUBLIC_API_BASE_URL" '{apiBaseUrl: $url}' > /usr/share/nginx/html/runtime-config.json
