#!/usr/bin/env node
/**
 * Seed portfolio history with realistic synthetic data.
 * Generates 10-minute interval snapshots from start date to now,
 * following a geometric Brownian motion path that matches the real
 * start and end portfolio values.
 *
 * Usage:
 *   node scripts/seed-history.mjs
 *
 * Reads portfolio state from Redis to get initialCapital and current totalValue.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 */

import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Seeded PRNG for reproducibility (mulberry32)
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution
function normalRandom(rng) {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

async function main() {
  const portfolio = await redis.get('tradingbot:portfolio');
  if (!portfolio) {
    console.error('No portfolio found in Redis');
    process.exit(1);
  }

  const startValue = portfolio.initialCapital || 10199.52;
  const endValue = portfolio.totalValue || startValue;
  const startDate = new Date('2025-12-30T14:30:00Z'); // Bot started ~Dec 30
  const endDate = new Date(); // Now

  console.log(`Generating history: $${startValue} → $${endValue}`);
  console.log(`Period: ${startDate.toISOString()} → ${endDate.toISOString()}`);

  // Generate timestamps every 10 minutes during market-relevant hours
  // The live bot runs 24/7 for crypto, so we'll generate points during active hours
  const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  const timestamps = [];
  let t = startDate.getTime();
  while (t <= endDate.getTime()) {
    const d = new Date(t);
    const hour = d.getUTCHours();
    // Generate points 6am-11pm UTC (covers US market hours + extended + crypto activity)
    if (hour >= 6 && hour <= 23) {
      timestamps.push(t);
    }
    t += INTERVAL_MS;
  }

  const N = timestamps.length;
  console.log(`Generating ${N} data points...`);

  // Use geometric Brownian motion with drift adjusted to hit the target end value
  // ln(endValue/startValue) = drift * N + volatility * sqrt(N) * Z
  // We set drift so the expected path hits endValue, then add noise
  const totalLogReturn = Math.log(endValue / startValue);
  const rng = mulberry32(42); // Fixed seed for reproducibility

  // Daily volatility ~0.8% for a diversified portfolio, scaled to 10-min intervals
  // ~102 ten-minute intervals per active day, so per-step vol = daily_vol / sqrt(102)
  const dailyVol = 0.008;
  const stepVol = dailyVol / Math.sqrt(102);

  // Generate raw path
  const logReturns = [];
  let sumNoise = 0;
  for (let i = 0; i < N; i++) {
    const noise = normalRandom(rng) * stepVol;
    logReturns.push(noise);
    sumNoise += noise;
  }

  // Adjust drift so path ends exactly at endValue
  // totalLogReturn = sum(drift + noise_i) = N*drift + sumNoise
  // drift = (totalLogReturn - sumNoise) / N
  const drift = (totalLogReturn - sumNoise) / N;

  // Build the equity curve
  const history = [];
  let value = startValue;
  for (let i = 0; i < N; i++) {
    const logReturn = drift + logReturns[i];
    value = value * Math.exp(logReturn);

    history.push({
      timestamp: new Date(timestamps[i]).toISOString(),
      totalValue: Math.round(value * 100) / 100,
    });
  }

  // Generate S&P 500 benchmark (real SPY return was ~-0.87% over this period)
  const spyStart = startValue;
  const spyReturn = -0.0087; // -0.87%
  const spyEnd = spyStart * (1 + spyReturn);
  const spyTotalLog = Math.log(spyEnd / spyStart);
  const spyRng = mulberry32(123);
  const spyDailyVol = 0.01; // SPY is slightly more volatile
  const spyStepVol = spyDailyVol / Math.sqrt(102);

  let spySumNoise = 0;
  const spyLogReturns = [];
  for (let i = 0; i < N; i++) {
    const noise = normalRandom(spyRng) * spyStepVol;
    spyLogReturns.push(noise);
    spySumNoise += noise;
  }
  const spyDrift = (spyTotalLog - spySumNoise) / N;

  const spyBenchmark = [];
  let spyValue = spyStart;
  for (let i = 0; i < N; i++) {
    spyValue = spyValue * Math.exp(spyDrift + spyLogReturns[i]);
    spyBenchmark.push({
      timestamp: new Date(timestamps[i]).toISOString(),
      value: Math.round(spyValue * 100) / 100,
    });
  }

  // Cap at 1000 entries (matching live bot limit) — take evenly spaced samples
  const maxEntries = 1000;
  const sample = (arr) => {
    if (arr.length <= maxEntries) return arr;
    const step = arr.length / maxEntries;
    const sampled = [];
    for (let i = 0; i < maxEntries - 1; i++) {
      sampled.push(arr[Math.floor(i * step)]);
    }
    sampled.push(arr[arr.length - 1]); // Always include the last point
    return sampled;
  };

  const sampledHistory = sample(history);
  const sampledBenchmark = sample(spyBenchmark);

  await redis.set('tradingbot:history', sampledHistory);
  await redis.set('tradingbot:spyBenchmark', sampledBenchmark);

  console.log(`\nWrote to Redis:`);
  console.log(`  History: ${sampledHistory.length} points ($${sampledHistory[0].totalValue} → $${sampledHistory[sampledHistory.length - 1].totalValue})`);
  console.log(`  Benchmark: ${sampledBenchmark.length} points ($${sampledBenchmark[0].value} → $${sampledBenchmark[sampledBenchmark.length - 1].value})`);
}

main().catch(console.error);
