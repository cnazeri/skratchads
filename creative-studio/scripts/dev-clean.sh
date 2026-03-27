#!/bin/bash
# dev-clean.sh: Wipe .next cache and start dev server fresh.
# Handles permission-locked files by moving the old dir aside if rm fails.

set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
NEXT_DIR="$DIR/.next"

echo "Cleaning build cache..."

if [ -d "$NEXT_DIR" ]; then
  rm -rf "$NEXT_DIR" 2>/dev/null || {
    # If rm fails (permission-locked files from a previous session),
    # move the old cache aside so Next.js starts fresh.
    STALE="$DIR/.next_stale_$(date +%s)"
    mv "$NEXT_DIR" "$STALE" 2>/dev/null || {
      echo "Warning: Could not remove or move .next cache."
      echo "Renaming internal folders to force fresh compilation..."
      # Last resort: rename the turbopack/cache dirs inside .next
      for sub in cache build server static; do
        [ -d "$NEXT_DIR/$sub" ] && mv "$NEXT_DIR/$sub" "$NEXT_DIR/${sub}_old_$(date +%s)" 2>/dev/null || true
      done
    }
    echo "Stale cache moved aside. Starting fresh."
  }
fi

echo "Starting dev server with Turbopack..."
exec npx next dev --turbopack "$@"
