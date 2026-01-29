#!/usr/bin/env node
/**
 * Market Visualization WebSocket Server
 * Polls /api/trading/market-data and broadcasts delta updates to connected clients.
 * Run on homelab alongside trading-bot.mjs.
 *
 * Usage:
 *   WS_PORT=8765 API_URL=https://brycekeeler.com/api/trading/market-data node scripts/market-ws-server.mjs
 *
 * Environment variables:
 *   WS_PORT          - WebSocket server port (default: 8765)
 *   POLL_INTERVAL_MS - How often to poll the API (default: 10000)
 *   API_URL          - Trading market data API URL
 */

import { WebSocketServer } from 'ws';

const PORT = parseInt(process.env.WS_PORT || '8765', 10);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '10000', 10);
const API_URL = process.env.API_URL || 'https://brycekeeler.com/api/trading/market-data';

const wss = new WebSocketServer({ port: PORT });
let lastData = null;
let clientCount = 0;
let pollErrors = 0;

console.log(`[market-ws] WebSocket server starting on port ${PORT}`);
console.log(`[market-ws] Polling ${API_URL} every ${POLL_INTERVAL_MS}ms`);

wss.on('connection', (ws, req) => {
  clientCount++;
  const ip = req.socket.remoteAddress;
  console.log(`[market-ws] Client connected from ${ip} (${clientCount} total)`);

  // Send full snapshot on connect
  if (lastData) {
    try {
      ws.send(JSON.stringify({ type: 'snapshot', data: lastData }));
    } catch (err) {
      console.error(`[market-ws] Error sending snapshot:`, err.message);
    }
  }

  ws.on('close', () => {
    clientCount--;
    console.log(`[market-ws] Client disconnected (${clientCount} remaining)`);
  });

  ws.on('error', (err) => {
    console.error(`[market-ws] WebSocket error:`, err.message);
  });

  // Handle ping/pong for connection health
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Heartbeat: detect dead connections every 30s
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[market-ws] Terminating dead connection');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

/**
 * Compute delta between previous and current data.
 * Only includes changed signals and metrics to minimize bandwidth.
 */
function computeDelta(prev, next) {
  const changedSignals = {};
  const changedMetrics = {};
  let hasChanges = false;

  // Check for changed signals
  for (const [sym, sig] of Object.entries(next.signals || {})) {
    const prevSig = prev.signals?.[sym];
    if (!prevSig ||
        prevSig.combined !== sig.combined ||
        prevSig.recommendation !== sig.recommendation ||
        prevSig.price !== sig.price) {
      changedSignals[sym] = sig;
      hasChanges = true;
    }
  }

  // Check for removed signals
  for (const sym of Object.keys(prev.signals || {})) {
    if (!next.signals?.[sym]) {
      changedSignals[sym] = null; // Signal removed
      hasChanges = true;
    }
  }

  // Check for changed metrics
  for (const [sym, met] of Object.entries(next.metrics || {})) {
    const prevMet = prev.metrics?.[sym];
    if (!prevMet ||
        prevMet.price !== met.price ||
        prevMet.changePercent !== met.changePercent ||
        prevMet.volume !== met.volume) {
      changedMetrics[sym] = met;
      hasChanges = true;
    }
  }

  if (!hasChanges) return null;

  return {
    signals: changedSignals,
    metrics: changedMetrics,
    timestamp: next.timestamp,
  };
}

/**
 * Broadcast a message to all connected clients.
 */
function broadcast(message) {
  if (wss.clients.size === 0) return;

  const payload = JSON.stringify(message);
  let sent = 0;

  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(payload);
        sent++;
      } catch (err) {
        console.error(`[market-ws] Broadcast error:`, err.message);
      }
    }
  });

  return sent;
}

/**
 * Poll the API for latest market data.
 */
async function poll() {
  try {
    const response = await fetch(API_URL, {
      headers: {
        'Cache-Control': 'no-cache',
        'User-Agent': 'MarketVizWSServer/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (lastData) {
      const delta = computeDelta(lastData, data);
      if (delta) {
        const signalCount = Object.keys(delta.signals).length;
        const metricCount = Object.keys(delta.metrics).length;
        const sent = broadcast({ type: 'delta', data: delta });
        if (sent > 0) {
          console.log(`[market-ws] Delta: ${signalCount} signals, ${metricCount} metrics -> ${sent} clients`);
        }
      }
    } else {
      // First poll - broadcast full snapshot to any already-connected clients
      broadcast({ type: 'snapshot', data });
      const totalSignals = Object.keys(data.signals || {}).length;
      const totalMetrics = Object.keys(data.metrics || {}).length;
      console.log(`[market-ws] Initial data: ${totalSignals} signals, ${totalMetrics} metrics`);
    }

    lastData = data;
    pollErrors = 0;
  } catch (err) {
    pollErrors++;
    console.error(`[market-ws] Poll error (${pollErrors}):`, err.message);

    // If many consecutive errors, notify clients
    if (pollErrors === 5) {
      broadcast({ type: 'error', message: 'Data feed temporarily unavailable' });
    }
  }
}

// Start polling
poll();
const pollInterval = setInterval(poll, POLL_INTERVAL_MS);

// Graceful shutdown
function shutdown() {
  console.log('[market-ws] Shutting down...');
  clearInterval(pollInterval);
  clearInterval(heartbeatInterval);
  wss.close(() => {
    console.log('[market-ws] Server closed');
    process.exit(0);
  });
  // Force exit after 5s
  setTimeout(() => process.exit(0), 5000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`[market-ws] Server ready on ws://0.0.0.0:${PORT}`);
