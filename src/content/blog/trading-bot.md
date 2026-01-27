---
title: "Building a Regime-Adaptive Algorithmic Trading Bot"
description: "How I built an ML-powered trading bot that adapts its strategy to market conditions, scans 2000+ assets, and executes automatically through Alpaca."
publishDate: 2026-01-27
tags: ["TypeScript", "Trading", "Machine Learning", "Finance", "React"]
---

I've always been interested in quantitative finance but never had the capital or infrastructure to do anything serious with it. Last year I decided to change that. I built a trading bot from scratch that scans over 2000 assets across stocks, crypto, forex, and futures, scores them using five strategy groups, and executes trades automatically through Alpaca. It runs on $10,000 of initial capital.

This post walks through the architecture, the algorithm, and what I learned along the way. The live dashboard is on my [website](/TradingBot) if you want to see it in action.

## The Core Idea

Most retail trading bots pick one strategy and stick with it. The problem is that no single strategy works in all market conditions. Trend-following prints money when the market is directional but gets chopped up in sideways action. Mean reversion thrives in range-bound markets but gets steamrolled by strong trends.

The solution is to detect what kind of market you're in and weight your strategies accordingly. This is called **regime-adaptive trading**, and it's the foundation of the entire system.

## Market Regime Detection

Before any strategy runs, the bot classifies the current market environment using the **ADX (Average Directional Index)** and SMA crossovers on daily data:

- **ADX > 25 and SMA-20 > SMA-50:** Trending up. Weight trend strategies at 80%, reversion at 20%.
- **ADX > 25 and SMA-20 < SMA-50:** Trending down. Same 80/20 split favoring trend.
- **ADX ≤ 25:** Range-bound. Flip it — 20% trend, 80% reversion.

This requires at least 60 daily bars to calculate reliably. The regime check runs once per cycle before any signals are generated.

## The Five Strategy Groups

### Group A: Trend-Following

**Trend Momentum** uses SMA-10, SMA-20, and SMA-50 alignment plus 20-day Rate of Change. When all three moving averages are properly aligned (10 > 20 > 50), that's a strong bullish signal worth +0.40 points. The strategy also looks at 50-day breakouts and SMA-20 slope for additional confirmation. Fixed confidence: 0.70.

**MACD Trend** uses the classic 12/26/9 MACD setup but focuses on histogram behavior rather than just crossovers. Histogram direction, slope, and MACD-vs-signal positioning each contribute to the score. Fixed confidence: 0.60.

### Group B: Mean-Reversion

**Bollinger Bands + RSI** fires when price touches the outer bands while RSI confirms oversold/overbought conditions. A bandwidth filter skips signals when volatility is too low (< 1%), which avoids false triggers in dead markets. Fixed confidence: 0.70.

**VWAP Reversion** uses Volume Weighted Average Price with a Z-score to measure how far price has deviated from fair value. The deeper the deviation, the higher the score and confidence. A Z-score below -2 generates a strong buy signal at 0.80 confidence. This is the only strategy with dynamic confidence — it ranges from 0.30 to 0.80 depending on extremity.

## Signal Combination

Each strategy produces a score (-1 to +1) and a confidence (0 to 1). The combination happens in two steps.

**Step 1: Within-Group Average.** Each group's strategies are combined using confidence-weighted averaging:

```
groupScore = Σ(score × confidence) / Σ(confidence)
```

**Step 2: Regime-Weighted Blend.** The two group scores are blended using the regime weights:

```
combined = trendScore × w_trend + reversionScore × w_reversion
```

The final combined score maps to a recommendation: STRONG_BUY (> 0.55), BUY (> 0.35), HOLD (-0.35 to 0.35), SELL (< -0.35), or STRONG_SELL (< -0.55).

## Position Sizing and Risk Management

Getting the signal right is only half the problem. Position sizing determines whether a good signal becomes a good trade.

**ATR-based sizing** is the core approach. For each trade, I risk 1% of the portfolio and set the stop at 2× ATR (Average True Range) below entry. The number of shares is simply:

```
shares = (portfolio × 1%) / (2 × ATR)
```

This means volatile assets automatically get smaller positions. Every position is capped at 7% of the portfolio regardless of signal strength.

**Tiered profit-taking** locks in gains at two levels:
- When unrealized gain hits 3× ATR, sell 25% of the position
- At 5× ATR, sell another 50% (75% total)

The remaining 25% rides with a trailing stop at 2× ATR below the high-water mark. This structure lets winners run while progressively reducing risk.

**Trade guards** prevent overtrading:
- Minimum 24-bar hold (~2 hours at intraday resolution)
- 4-hour cooldown per symbol after closing
- Maximum 3 new positions per cycle
- 5 basis point transaction cost applied to every trade

## The Asset Universe

The bot scans across four markets:

- **Equities:** S&P 500 + NASDAQ-100 (~600 stocks)
- **Crypto:** 30 assets including BTC, ETH, SOL (24/7 trading)
- **Forex:** 20 major pairs (24/5 trading)
- **Futures:** 18 contracts (ES, NQ, GC, CL, ZB)

Each asset has category metadata (Technology, Healthcare, Crypto, etc.) which helps with sector-level analysis. The multi-market coverage means there are always opportunities somewhere, even when US equities are closed.

## Technical Indicators

All indicators are computed from raw OHLCV data. No external TA library — everything is implemented from scratch:

- **SMA** (10, 20, 50-period) — sliding window average
- **EMA** — used in MACD and ATR, with multiplier 2/(period+1)
- **RSI** (14-period) — average gains vs losses, 0-100 scale
- **MACD** (12/26/9) — dual EMA crossover with signal line
- **Bollinger Bands** (20-period, 2σ) — volatility envelope
- **ATR** (14-period) — true range EMA for volatility measurement
- **VWAP + Z-score** — volume-weighted fair value deviation

Implementing these from scratch was a deliberate choice. It forces you to actually understand what each indicator measures instead of treating it as a black box. I found several subtle bugs in my initial RSI implementation that I never would have caught using a library.

## Backtesting

The bot runs backtests against SPY as a benchmark. Key metrics tracked:

- **Win Rate:** Percentage of closed trades that were profitable
- **Sharpe Ratio:** Risk-adjusted returns using a 5% risk-free rate
- **Max Drawdown:** Largest peak-to-trough decline
- **Volatility:** Annualized standard deviation (252 trading days)
- **Per-Strategy Win Rates:** Which strategies are actually contributing

Portfolio history is snapshotted every cycle, giving a minute-level equity curve that can be compared directly against the S&P 500.

## Tech Stack

The system is built with:

- **Frontend:** React + TypeScript running inside Astro, with an interactive dashboard showing live positions, performance charts, trade logs, and the full algorithm breakdown
- **Backend:** Astro API routes on Vercel with server-side JSON persistence
- **Data:** Yahoo Finance API for historical OHLCV data (3 months daily + 1-day intraday)
- **Execution:** Alpaca API for paper trading and live execution
- **Storage:** Upstash Redis for persistent state across deployments

The batch processing system runs through symbols in groups of 15 with 500ms delays to stay within API rate limits. The entire analysis cycle — scanning 600+ assets, computing indicators, generating signals, and executing trades — completes in under a minute.

## What I Learned

**Regime detection is everything.** Before I added the ADX-based regime classification, the bot was mediocre. It would trend-follow in choppy markets and mean-revert during breakouts. The regime filter alone improved simulated Sharpe ratio significantly.

**ATR-based position sizing is non-negotiable.** Fixed dollar amounts per trade is a beginner mistake. A $100 position in a low-volatility utility stock is fundamentally different from $100 in a high-volatility crypto. ATR normalizes this automatically.

**Transaction costs matter more than you think.** At 5 basis points per side, a round-trip costs 10 bps. With 15 active positions turning over regularly, these add up. The minimum hold period and cooldown guards exist specifically to prevent the bot from churning through fees.

**Sentiment analysis is the weakest link.** The current implementation is a basic word-matching approach on news headlines. It works as a slight edge but it's nowhere near what a fine-tuned FinBERT model could do. This is the area with the most room for improvement.

## Try It

The live dashboard is at [brycekeeler.com/TradingBot](/TradingBot). It shows real-time portfolio value, open positions, trade history, strategy signals for individual assets, and a full breakdown of how the algorithm works. The algorithm tab walks through every formula with a worked numerical example.
