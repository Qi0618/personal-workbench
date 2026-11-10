#!/bin/bash
# Boot Lumen in the browser: the shipped web profile plus @lumen/bundle.
# The first run creates the profile under $DSH_HOME/profiles and links this
# checkout's bundle into it; later runs boot it directly. Arguments go to dsh,
# for example: web.sh --host 127.0.0.1 --port 3081
set -euo pipefail
REPO="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../../../.." && pwd)"
PROFILE="${LUMEN_PROFILE:-lumen}"
MANIFEST="${DSH_HOME:-$HOME/.dsh}/profiles/$PROFILE/package.json"
cd "$REPO"
if command -v pnpm > /dev/null; then PNPM=(pnpm); else PNPM=(corepack pnpm); fi
if [ ! -f "$MANIFEST" ]; then
  "${PNPM[@]}" -s dsh --profile "$PROFILE" --from-default-profile web --dump-config > /dev/null
fi
if ! grep -q '"@lumen/bundle"' "$MANIFEST"; then
  "${PNPM[@]}" -s dsh plugin --profile "$PROFILE" add "link:$REPO/packages/lumen/bundle"
fi
exec "${PNPM[@]}" -s dsh --profile "$PROFILE" "$@"
