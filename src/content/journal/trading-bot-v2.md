---
title: "Trading bot regime detection"
publishDate: 2026-01-03
tags: ["trading", "projects"]
---

Added regime detection to the trading bot. Uses ADX to classify market conditions as trending up, trending down, or range-bound. The strategy weights now shift based on regime -- momentum strategies get more weight in trends, mean reversion gets more weight in ranges.

Early backtesting looks promising but I need more data to be confident.
