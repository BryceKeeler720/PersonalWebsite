#!/bin/bash
# Auto-update trading bot from git repo
# Run via cron or manually: bash /root/PersonalWebsite/scripts/update-trading-bot.sh

REPO_DIR="/root/PersonalWebsite"
SCRIPT_SRC="$REPO_DIR/scripts/trading-bot.mjs"
SCRIPT_DST="/opt/trading-bot/trading-bot.mjs"
SERVICE="trading-bot"

cd "$REPO_DIR" || exit 1

# Fetch latest changes
git fetch origin main --quiet

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" != "$REMOTE" ]; then
    echo "$(date): Updates found, pulling changes..."
    git pull origin main --quiet
    cp "$SCRIPT_SRC" "$SCRIPT_DST"
    systemctl restart "$SERVICE"
    echo "$(date): Trading bot updated and restarted."
else
    echo "$(date): No updates."
fi
