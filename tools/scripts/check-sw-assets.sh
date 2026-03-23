#!/bin/bash
# Verify all JS files are listed in service-worker.js ASSETS array
# Usage: bash tools/scripts/check-sw-assets.sh

MISSING=0
for file in js/*.js; do
  basename=$(basename "$file")
  if ! grep -q "$basename" service-worker.js; then
    echo "MISSING from service-worker.js: $file"
    MISSING=1
  fi
done

if [ $MISSING -eq 0 ]; then
  echo "All JS files are listed in service-worker.js ASSETS."
else
  echo ""
  echo "ERROR: Some JS files are not cached by the service worker."
  exit 1
fi
