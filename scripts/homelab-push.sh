#!/bin/bash
# homelab-push.sh — Collects Proxmox metrics and pushes to Upstash Redis
#
# Setup:
#   1. Copy this script to your Proxmox host
#   2. Fill in UPSTASH_URL, UPSTASH_TOKEN, NODE_NAME, and SERVICES below
#   3. chmod +x homelab-push.sh
#   4. Add to cron: * * * * * /path/to/homelab-push.sh
#
# Requirements: pvesh, curl, jq

# ─── Configuration ──────────────────────────────────────────
UPSTASH_URL="https://YOUR_UPSTASH_URL"
UPSTASH_TOKEN="YOUR_UPSTASH_TOKEN"
NODE_NAME="pve"  # Your Proxmox node name

# Services to health-check (name|url)
SERVICES=(
  "Pi-hole|http://10.0.10.2/admin"
  "Jellyfin|http://10.0.10.3:8096"
  "Grafana|http://10.0.10.4:3000"
  "Uptime Kuma|http://10.0.10.5:3001"
  "FastAPI App|http://10.0.10.6:8000/health"
  "Nginx Proxy|http://10.0.10.7:81"
)

# Storage pools to monitor (pool-name)
STORAGE_POOLS=("local" "local-zfs")

# ─── Collect Node Metrics ───────────────────────────────────
NODE_STATUS=$(pvesh get /nodes/${NODE_NAME}/status --output-format json 2>/dev/null)

if [ -z "$NODE_STATUS" ]; then
  echo "Error: Could not get node status from pvesh"
  exit 1
fi

NODE_CPU=$(echo "$NODE_STATUS" | jq -r '.cpu * 100')
NODE_RAM_USED=$(echo "$NODE_STATUS" | jq -r '.memory.used')
NODE_RAM_TOTAL=$(echo "$NODE_STATUS" | jq -r '.memory.total')
NODE_SWAP_USED=$(echo "$NODE_STATUS" | jq -r '.swap.used')
NODE_SWAP_TOTAL=$(echo "$NODE_STATUS" | jq -r '.swap.total')
NODE_UPTIME=$(echo "$NODE_STATUS" | jq -r '.uptime')
NODE_KERNEL=$(uname -r)
NODE_HOSTNAME=$(hostname)

# ─── Collect Container/VM Metrics ───────────────────────────
CONTAINERS="[]"

# LXC containers
LXC_LIST=$(pvesh get /nodes/${NODE_NAME}/lxc --output-format json 2>/dev/null)
if [ -n "$LXC_LIST" ] && [ "$LXC_LIST" != "null" ]; then
  CONTAINERS=$(echo "$LXC_LIST" | jq '[.[] | {
    vmid: .vmid,
    name: .name,
    type: "lxc",
    status: .status,
    cpu: ((.cpu // 0) * 100),
    ram: { used: (.mem // 0), total: (.maxmem // 0) },
    disk: { used: (.disk // 0), total: (.maxdisk // 0) },
    uptime: (.uptime // 0)
  }]')
fi

# QEMU VMs
QEMU_LIST=$(pvesh get /nodes/${NODE_NAME}/qemu --output-format json 2>/dev/null)
if [ -n "$QEMU_LIST" ] && [ "$QEMU_LIST" != "null" ]; then
  QEMU_PARSED=$(echo "$QEMU_LIST" | jq '[.[] | {
    vmid: .vmid,
    name: .name,
    type: "qemu",
    status: .status,
    cpu: ((.cpu // 0) * 100),
    ram: { used: (.mem // 0), total: (.maxmem // 0) },
    disk: { used: (.disk // 0), total: (.maxdisk // 0) },
    uptime: (.uptime // 0)
  }]')
  CONTAINERS=$(echo "$CONTAINERS $QEMU_PARSED" | jq -s '.[0] + .[1]')
fi

# ─── Health Check Services ──────────────────────────────────
SERVICE_CHECKS="[]"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

for svc in "${SERVICES[@]}"; do
  IFS='|' read -r SVC_NAME SVC_URL <<< "$svc"

  START_MS=$(date +%s%N)
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 10 "$SVC_URL" 2>/dev/null || echo "000")
  END_MS=$(date +%s%N)
  RESPONSE_MS=$(( (END_MS - START_MS) / 1000000 ))

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 400 ] 2>/dev/null; then
    STATUS="up"
  elif [ "$HTTP_CODE" = "000" ]; then
    STATUS="down"
    RESPONSE_MS=0
  else
    STATUS="down"
  fi

  SERVICE_CHECKS=$(echo "$SERVICE_CHECKS" | jq --arg name "$SVC_NAME" --arg url "$SVC_URL" --arg status "$STATUS" \
    --argjson rt "$RESPONSE_MS" --argjson code "${HTTP_CODE:-0}" --arg ts "$TIMESTAMP" \
    '. + [{name: $name, url: $url, status: $status, responseTime: $rt, httpCode: ($code | tonumber), lastChecked: $ts}]')
done

# ─── Collect Storage ────────────────────────────────────────
STORAGE_DATA="[]"

for pool in "${STORAGE_POOLS[@]}"; do
  POOL_STATUS=$(pvesh get /nodes/${NODE_NAME}/storage/${pool}/status --output-format json 2>/dev/null)
  if [ -n "$POOL_STATUS" ] && [ "$POOL_STATUS" != "null" ]; then
    POOL_ENTRY=$(echo "$POOL_STATUS" | jq --arg name "$pool" '{
      name: $name,
      type: (.type // "unknown"),
      used: (.used // 0),
      total: (.total // 0)
    }')
    STORAGE_DATA=$(echo "$STORAGE_DATA" | jq --argjson entry "$POOL_ENTRY" '. + [$entry]')
  fi
done

# ─── Build Snapshot JSON ────────────────────────────────────
SNAPSHOT=$(jq -n \
  --arg ts "$TIMESTAMP" \
  --arg hostname "$NODE_HOSTNAME" \
  --argjson uptime "${NODE_UPTIME:-0}" \
  --argjson cpu "${NODE_CPU:-0}" \
  --argjson ram_used "${NODE_RAM_USED:-0}" \
  --argjson ram_total "${NODE_RAM_TOTAL:-0}" \
  --argjson swap_used "${NODE_SWAP_USED:-0}" \
  --argjson swap_total "${NODE_SWAP_TOTAL:-0}" \
  --arg kernel "$NODE_KERNEL" \
  --argjson containers "$CONTAINERS" \
  --argjson services "$SERVICE_CHECKS" \
  --argjson storage "$STORAGE_DATA" \
  '{
    timestamp: $ts,
    node: {
      hostname: $hostname,
      uptime: $uptime,
      cpu: $cpu,
      ram: { used: $ram_used, total: $ram_total },
      swap: { used: $swap_used, total: $swap_total },
      kernel: $kernel
    },
    containers: $containers,
    services: $services,
    storage: $storage
  }')

# ─── Push to Upstash Redis ─────────────────────────────────
# Set latest snapshot
curl -s -X POST "${UPSTASH_URL}" \
  -H "Authorization: Bearer ${UPSTASH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"command\": [\"SET\", \"homelab:latest\", $(echo "$SNAPSHOT" | jq -Rs .)]}" \
  > /dev/null

# Append to history (compact: just timestamp, cpu, ram%)
RAM_PERCENT=$(echo "$NODE_RAM_USED $NODE_RAM_TOTAL" | awk '{if ($2 > 0) printf "%.1f", ($1/$2)*100; else print "0"}')
HISTORY_ENTRY=$(jq -n --arg ts "$TIMESTAMP" --argjson cpu "${NODE_CPU:-0}" --argjson ram "$RAM_PERCENT" \
  '{timestamp: $ts, cpu: $cpu, ram: $ram}')

# Push to list and trim to 1440 entries (24h of per-minute data)
curl -s -X POST "${UPSTASH_URL}/pipeline" \
  -H "Authorization: Bearer ${UPSTASH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "[
    [\"RPUSH\", \"homelab:history_list\", $(echo "$HISTORY_ENTRY" | jq -Rs .)],
    [\"LTRIM\", \"homelab:history_list\", \"-1440\", \"-1\"]
  ]" \
  > /dev/null

echo "$(date): Pushed homelab snapshot to Redis"
