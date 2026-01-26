#!/bin/bash
# Trading Bot Setup Script for Proxmox LXC
# Run this on your LXC container after creating it

set -e

echo "=========================================="
echo "Trading Bot Setup Script"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo ./setup-trading-bot.sh)"
  exit 1
fi

# Install Node.js 20
echo ""
echo "[1/6] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "Node.js already installed: $(node -v)"
fi

# Create trading user
echo ""
echo "[2/6] Creating trading user..."
if ! id "trading" &>/dev/null; then
  useradd -r -s /bin/false trading
  echo "User 'trading' created"
else
  echo "User 'trading' already exists"
fi

# Create directory structure
echo ""
echo "[3/6] Setting up directories..."
mkdir -p /opt/trading-bot
chown trading:trading /opt/trading-bot

# Copy files
echo ""
echo "[4/6] Copying bot files..."
cp trading-bot.mjs /opt/trading-bot/
chown trading:trading /opt/trading-bot/trading-bot.mjs

# Install dependencies
echo ""
echo "[5/6] Installing dependencies..."
cd /opt/trading-bot
npm init -y > /dev/null 2>&1 || true
npm install @upstash/redis

# Create .env file if it doesn't exist
if [ ! -f /opt/trading-bot/.env ]; then
  echo ""
  echo "[!] Creating .env template..."
  cat > /opt/trading-bot/.env << 'EOF'
# Trading Bot Environment Variables
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Run interval in milliseconds (default: 60000 = 1 minute)
RUN_INTERVAL_MS=60000
EOF
  chown trading:trading /opt/trading-bot/.env
  chmod 600 /opt/trading-bot/.env
  echo ""
  echo "!!! IMPORTANT: Edit /opt/trading-bot/.env with your Redis credentials !!!"
fi

# Install systemd service
echo ""
echo "[6/6] Installing systemd service..."
cp trading-bot.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable trading-bot

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Edit /opt/trading-bot/.env with your Redis credentials"
echo "  2. Start the service: systemctl start trading-bot"
echo "  3. Check status: systemctl status trading-bot"
echo "  4. View logs: journalctl -u trading-bot -f"
echo ""
echo "Useful commands:"
echo "  systemctl start trading-bot    # Start the bot"
echo "  systemctl stop trading-bot     # Stop the bot"
echo "  systemctl restart trading-bot  # Restart the bot"
echo "  journalctl -u trading-bot -f   # Follow logs"
echo ""
