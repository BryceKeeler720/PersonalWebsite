---
title: "Hybrid data: Yahoo + Alpaca"
publishDate: 2026-01-27
tags: ["trading", "projects"]
---

Integrated Yahoo Finance as a secondary data source for the trading bot. Alpaca handles stocks and crypto, Yahoo handles forex and futures. About 38 additional assets are now getting full signal analysis instead of being skipped.

Also fixed the BB+RSI reversion strategy in the Vercel cron -- it was using Z-score instead of RSI, which is why the metric was always empty. Both the trading bot and the dashboard now use the same BB+RSI logic.
