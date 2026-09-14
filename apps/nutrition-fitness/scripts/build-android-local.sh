#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Builds on this Mac (Android SDK/Gradle required) instead of EAS's cloud
# workers. Produces a local .aab; does not upload anywhere.
npx eas-cli@latest build --platform android --profile production --local "$@"
