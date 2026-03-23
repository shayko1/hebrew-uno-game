#!/bin/bash
# Check for console.log statements in production JS files
# Usage: bash tools/scripts/check-no-console-log.sh

FOUND=0
for file in js/*.js; do
  matches=$(grep -n 'console\.log' "$file" 2>/dev/null)
  if [ -n "$matches" ]; then
    echo "Found console.log in $file:"
    echo "$matches"
    FOUND=1
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "No console.log statements found in js/ files."
else
  echo ""
  echo "WARNING: Remove console.log before release."
  exit 1
fi
