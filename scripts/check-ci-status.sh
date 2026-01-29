#!/bin/bash

# Vercel Ignored Build Step
# Exit 0 = skip build, Exit 1 = proceed with build

# Always build preview deployments (PRs)
if [ "$VERCEL_ENV" = "preview" ]; then
  echo "Preview deployment - proceeding with build"
  exit 1
fi

# For production, check if GitHub CI has passed
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GITHUB_TOKEN not set - skipping CI check, proceeding with build"
  exit 1
fi

REPO="BryceKeeler720/PersonalWebsite"
SHA="$VERCEL_GIT_COMMIT_SHA"

echo "Checking CI status for commit $SHA..."

# GitHub Actions uses Check Runs, not Commit Statuses
RESPONSE=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/commits/$SHA/check-runs")

TOTAL=$(echo "$RESPONSE" | grep -o '"total_count": [0-9]*' | head -1 | grep -o '[0-9]*')
COMPLETED=$(echo "$RESPONSE" | grep -o '"status": "completed"' | wc -l)
SUCCESSES=$(echo "$RESPONSE" | grep -o '"conclusion": "success"' | wc -l)

echo "Check runs: $TOTAL total, $COMPLETED completed, $SUCCESSES successful"

if [ "$TOTAL" -gt 0 ] && [ "$TOTAL" -eq "$SUCCESSES" ]; then
  echo "All checks passed - proceeding with build"
  exit 1
elif [ "$COMPLETED" -lt "$TOTAL" ] 2>/dev/null; then
  echo "Checks still running - skipping build (will redeploy after CI passes)"
  exit 0
else
  echo "Checks failed or not found - skipping build"
  exit 0
fi
