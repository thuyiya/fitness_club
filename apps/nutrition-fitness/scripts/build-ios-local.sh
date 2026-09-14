#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi

# Builds on this Mac (Xcode/CocoaPods/fastlane required) instead of EAS's
# cloud workers. Produces a local .ipa; does not upload anywhere.
npx eas-cli@latest build --platform ios --profile production --local "$@"
