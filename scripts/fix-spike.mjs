#!/usr/bin/env node
/**
 * Remove outlier spikes from portfolio history in Redis.
 * Finds points where the value jumps more than 3% from both neighbors and removes them.
 */
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const history = await redis.get('tradingbot:history');
console.log(`History: ${history.length} points`);

// Print top 10 highest values to see the spike
const sorted = [...history].sort((a, b) => b.totalValue - a.totalValue);
console.log('\nTop 10 highest values:');
sorted.slice(0, 10).forEach(p => console.log(`  ${p.timestamp}  $${p.totalValue}`));

// Print values around Jan 20-30
console.log('\nValues Jan 20-31:');
history.filter(p => {
  const d = new Date(p.timestamp);
  return d >= new Date('2026-01-20') && d <= new Date('2026-01-31');
}).forEach(p => console.log(`  ${p.timestamp}  $${p.totalValue}`));

// Remove outliers: any point that jumps >3% from BOTH its neighbors
const cleaned = [history[0]];
let removed = 0;
for (let i = 1; i < history.length - 1; i++) {
  const prev = history[i - 1].totalValue;
  const curr = history[i].totalValue;
  const next = history[i + 1].totalValue;
  const jumpFromPrev = Math.abs((curr - prev) / prev);
  const jumpToNext = Math.abs((curr - next) / next);
  if (jumpFromPrev > 0.03 && jumpToNext > 0.03) {
    console.log(`\nRemoving outlier: ${history[i].timestamp} $${curr} (prev: $${prev}, next: $${next})`);
    removed++;
  } else {
    cleaned.push(history[i]);
  }
}
cleaned.push(history[history.length - 1]);

if (removed > 0) {
  await redis.set('tradingbot:history', cleaned);
  console.log(`\nRemoved ${removed} outliers. History now ${cleaned.length} points.`);
} else {
  console.log('\nNo outliers found. Data looks clean.');
}
