#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

if [ "$#" -eq 0 ]; then
  # No args: submit the most recent EAS cloud build.
  npx eas-cli@latest submit --platform android --latest
else
  # Args given (e.g. --path some.aab for a local build): pass through as-is.
  npx eas-cli@latest submit --platform android "$@"
fi
