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

# Get the combined status from GitHub
STATUS=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/$REPO/commits/$SHA/status" | \
  grep -o '"state": "[^"]*"' | head -1 | cut -d'"' -f4)

echo "CI status: $STATUS"

if [ "$STATUS" = "success" ]; then
  echo "CI passed - proceeding with build"
  exit 1
elif [ "$STATUS" = "pending" ]; then
  echo "CI still running - skipping build (will redeploy after CI passes)"
  exit 0
else
  echo "CI failed or unknown status - skipping build"
  exit 0
fi
