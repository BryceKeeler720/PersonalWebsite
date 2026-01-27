---
title: "Building a Real-Time Home Lab Dashboard on a Serverless Stack"
description: "How I built a live monitoring dashboard for my Proxmox server using a bash script, Upstash Redis, and React — without exposing my home network."
publishDate: 2026-01-27
tags: ["Proxmox", "Redis", "React", "TypeScript", "Home Lab", "DevOps"]
---

I run a Proxmox server at home with about 15 containers handling everything from Pi-hole to a trading bot. For a while I monitored it through the Proxmox web UI and a Grafana instance, but both required being on my local network or connecting through Tailscale. I wanted something I could glance at from my phone without any VPN, ideally embedded in my personal website.

The challenge: my website deploys on Vercel, which can't reach my home network. So I built a push-based monitoring system where the Proxmox server sends metrics to the cloud every minute, and the website reads them on demand. The live dashboard is at [brycekeeler.com/HomeLab](/HomeLab).

## Architecture

The data flows in one direction:

```
Proxmox (cron) → Upstash Redis → Vercel API → React Dashboard
```

**Why push instead of pull?** Vercel functions can't initiate connections to a private network. I could have used Tailscale Funnel or Cloudflare Tunnels to expose an endpoint, but that adds complexity and attack surface. A simple cron job pushing to Redis is dead simple and requires zero inbound connections to my home network.

**Why Upstash Redis?** I already use it for my trading bot. It's serverless, has a REST API that works from both bash and Node.js, and the free tier is more than enough for once-per-minute pushes. The two projects share the same Redis instance with different key prefixes.

## The Push Script

A bash script runs every minute via cron on the Proxmox host. It collects four categories of data using the Proxmox API (`pvesh`):

### Node Metrics

```bash
NODE_STATUS=$(pvesh get /nodes/${NODE_NAME}/status --output-format json)

NODE_CPU=$(echo "$NODE_STATUS" | jq -r '.cpu * 100')
NODE_RAM_USED=$(echo "$NODE_STATUS" | jq -r '.memory.used')
NODE_RAM_TOTAL=$(echo "$NODE_STATUS" | jq -r '.memory.total')
NODE_UPTIME=$(echo "$NODE_STATUS" | jq -r '.uptime')
```

This gives CPU percentage, RAM in bytes, swap usage, uptime, and kernel version. Simple and reliable.

### Container Discovery

```bash
LXC_LIST=$(pvesh get /nodes/${NODE_NAME}/lxc --output-format json)
QEMU_LIST=$(pvesh get /nodes/${NODE_NAME}/qemu --output-format json)
```

Both LXC containers and QEMU VMs are discovered automatically. For each one, the script extracts VMID, name, type, status, CPU, RAM, disk, and uptime. I don't hardcode container lists — if I spin up a new container, it appears on the dashboard automatically.

### Service Health Checks

This was the most interesting part. Some containers have static IPs, but most use DHCP. I needed a way to health-check services without hardcoding IPs that could change on reboot.

The solution: `pct exec` to resolve IPs at runtime.

```bash
# Static IP services
SERVICES=(
  "Pi-hole|http://192.168.0.98/admin"
  "Jellyfin|http://192.168.0.105:8096"
)

# DHCP services — resolve IP dynamically
for entry in "104|Content API|8000|/health"; do
  IFS='|' read -r VMID SVC_NAME SVC_PORT SVC_PATH <<< "$entry"
  SVC_IP=$(pct exec "$VMID" -- hostname -I 2>/dev/null | awk '{print $1}')
  if [ -n "$SVC_IP" ]; then
    SERVICES+=("${SVC_NAME}|http://${SVC_IP}:${SVC_PORT}${SVC_PATH}")
  fi
done
```

Each service gets a `curl` health check with a 5-second connection timeout. The script records the HTTP status code and response time in milliseconds:

```bash
START_MS=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 10 "$SVC_URL")
END_MS=$(date +%s%N)
RESPONSE_MS=$(( (END_MS - START_MS) / 1000000 ))
```

### Storage Pools

```bash
for pool in "local" "local-lvm"; do
  pvesh get /nodes/${NODE_NAME}/storage/${pool}/status --output-format json
done
```

Each pool reports its type, used space, and total capacity.

## Redis Data Model

The script pushes two keys to Redis:

**`homelab:latest`** — A full JSON snapshot (~5-10 KB) containing node metrics, all containers, service checks, and storage. Overwritten every minute with SET.

**`homelab:history_list`** — A Redis list of compact history entries, each just timestamp + CPU + RAM percentage (~50 bytes). The list is maintained with RPUSH + LTRIM to keep exactly 1440 entries — 24 hours of per-minute data.

```bash
# Full snapshot
curl -X POST "${UPSTASH_URL}" \
  -d "[\"SET\", \"homelab:latest\", ${SNAPSHOT_JSON}]"

# History append + trim (pipelined)
curl -X POST "${UPSTASH_URL}/pipeline" \
  -d "[
    [\"RPUSH\", \"homelab:history_list\", ${HISTORY_ENTRY}],
    [\"LTRIM\", \"homelab:history_list\", \"-1440\", \"-1\"]
  ]"
```

The pipeline endpoint runs both commands atomically, which prevents the list from growing unbounded even if the trim fails independently.

Using a Redis list instead of a JSON blob for history was a deliberate choice. With a blob, you'd need to GET the entire array, append to it, and SET it back — a read-modify-write cycle that's not atomic and wastes bandwidth. RPUSH + LTRIM is O(1) for the append and O(n) for the trim, but since n is fixed at 1440, it's effectively constant.

## The API Layer

On the Vercel side, a server-rendered Astro API route reads from Redis and returns the data to the frontend:

```typescript
export const GET: APIRoute = async () => {
  const [latest, history] = await Promise.all([
    getHomelabLatest(),
    getHomelabHistory(),
  ]);

  return new Response(JSON.stringify({ latest, history, timestamp: Date.now() }), {
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
  });
};
```

The `no-cache` header is important — Vercel aggressively caches edge responses, and stale monitoring data is worse than no data. The `getHomelabHistory` function reads the Redis list with `lrange` and parses each entry from its stored string format.

## The Dashboard

The React frontend polls the API every 60 seconds and renders four tabs:

### Overview

The main view shows a sidebar with circular SVG gauges for CPU and RAM, storage pool bars, and node info (hostname, uptime, kernel). The main area has summary cards (containers running/stopped, services online/offline) and a dual-line resource history chart spanning the last 24 hours.

The circular gauges use SVG `stroke-dasharray` and `stroke-dashoffset` to draw arcs:

```typescript
const circumference = 2 * Math.PI * radius;
const offset = circumference - (percent / 100) * circumference;

<circle
  strokeDasharray={circumference}
  strokeDashoffset={offset}
  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
/>
```

No charting library needed. The resource history chart is also raw SVG — just two polylines (CPU in indigo, RAM in green) plotted across a 700×120 viewbox with grid lines at 25% intervals.

### Containers

A sortable grid of cards for every container and VM. Each card shows status, CPU, RAM, and disk usage with color-coded progress bars. You can sort by name, status, CPU, or RAM. Container type (LXC vs QEMU) gets a badge.

### Uptime

A list of monitored services with status indicators, response times, and URLs. The summary shows counts of services online vs offline. Each service card has a colored left border — green for up, red for down.

### Network

A hardcoded but data-driven network topology showing my four VLANs (Management, Servers, IoT, Personal) as swim lanes with SVG icons for each device. Key connections are labeled (DNS, reverse proxy, NFS, VPN mesh). I chose to hardcode this because my network topology rarely changes, and auto-discovery would require an agent on every device.

## The Design

The dashboard follows the same glassmorphism dark theme as the rest of my site:

- Card backgrounds at `rgba(255,255,255,0.03)` with `backdrop-filter: blur(10px)`
- Borders at `rgba(255,255,255,0.08)`
- 16px border radius everywhere
- Color coding: indigo for CPU, green for RAM/healthy, amber for storage/warnings, red for errors

The sidebar is sticky on desktop and collapses into the flow on mobile. The whole layout is responsive down to 768px.

## What I'd Do Differently

**Use WebSockets instead of polling.** The 60-second poll interval means there's up to a minute of latency between a container going down and the dashboard reflecting it. A WebSocket connection through something like Ably or Pusher would give near-instant updates. For a personal project the polling is fine, but it's the obvious next upgrade.

**Add alerting.** The dashboard shows you what's happening, but it doesn't tell you when something goes wrong. A simple webhook to Discord when a service health check fails would be genuinely useful. The data is already in Redis — it just needs something watching it.

**Historical aggregation.** Right now history is 24 hours of per-minute data. For longer-term trends, I'd want to downsample older data — keep per-minute for 24 hours, per-hour for 30 days, per-day for a year. This would require a separate aggregation job but would make capacity planning possible.

## Try It

The live dashboard is at [brycekeeler.com/HomeLab](/HomeLab). If you run Proxmox and want to build something similar, the architecture is straightforward: a bash script, a Redis instance, and a frontend. The push-based approach means you never need to expose your home network to the internet.
