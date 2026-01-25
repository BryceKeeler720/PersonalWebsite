import type { APIRoute } from 'astro';
import {
  getPortfolio,
  savePortfolio,
  addTrade,
  getSignals,
  setLastRun,
  addPortfolioSnapshot,
} from '../../../lib/trading/serverStorage';
import { DEFAULT_CONFIG } from '../../../components/trading/types';
import type { Trade, SignalSnapshot, Holding } from '../../../components/trading/types';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

async function fetchYahooQuote(symbol: string): Promise<{ price: number; isExtendedHours: boolean } | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d&includePrePost=true`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result?.meta) return null;

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;

    if (quotes?.close && timestamps && timestamps.length > 0) {
      for (let i = quotes.close.length - 1; i >= 0; i--) {
        if (quotes.close[i] !== null) {
          const lastTimestamp = timestamps[i];
          const tradingPeriod = meta.currentTradingPeriod;

          const isPreMarket = tradingPeriod?.pre &&
            lastTimestamp >= tradingPeriod.pre.start &&
            lastTimestamp < tradingPeriod.pre.end;
          const isPostMarket = tradingPeriod?.post &&
            lastTimestamp >= tradingPeriod.post.start &&
            lastTimestamp < tradingPeriod.post.end;

          return {
            price: quotes.close[i],
            isExtendedHours: isPreMarket || isPostMarket
          };
        }
      }
    }

    if (meta.regularMarketPrice) {
      return { price: meta.regularMarketPrice, isExtendedHours: false };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

export const GET: APIRoute = async ({ request }) => {
  // Verify authorization
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    console.log('Starting portfolio rebalance...');

    let portfolio = await getPortfolio();
    const allSignals = await getSignals();

    if (!allSignals || Object.keys(allSignals).length === 0) {
      return new Response(
        JSON.stringify({
          error: 'No signals available',
          message: 'Run the cron job first to analyze assets',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const soldPositions: string[] = [];
    const boughtPositions: string[] = [];

    // Step 1: Evaluate all current holdings and sell weak ones
    // Sell criteria: signal score < 0.02 (below buy threshold) or no signal data
    const holdingsToSell: Holding[] = [];
    const holdingsToKeep: Holding[] = [];

    for (const holding of portfolio.holdings) {
      const signal = allSignals[holding.symbol];

      // Sell if: no signal, negative signal, or signal below buy threshold
      if (!signal || signal.combined < 0.02) {
        holdingsToSell.push(holding);
      } else {
        holdingsToKeep.push(holding);
      }
    }

    console.log(`Holdings to sell: ${holdingsToSell.length}, to keep: ${holdingsToKeep.length}`);

    // Execute sells
    for (const holding of holdingsToSell) {
      const quote = await fetchYahooQuote(holding.symbol);
      if (!quote) {
        console.log(`Skipping sell of ${holding.symbol} - could not get quote`);
        continue;
      }

      const signal = allSignals[holding.symbol];
      const trade: Trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: holding.symbol,
        action: 'SELL',
        shares: holding.shares,
        price: quote.price,
        total: holding.shares * quote.price,
        reason: `REBALANCE: ${signal ? `weak signal (${signal.combined.toFixed(3)})` : 'no signal data'}`,
        signals: signal || {
          symbol: holding.symbol,
          timestamp: new Date().toISOString(),
          momentum: { name: 'momentum', score: 0, confidence: 0, reason: 'N/A' },
          meanReversion: { name: 'meanReversion', score: 0, confidence: 0, reason: 'N/A' },
          sentiment: { name: 'sentiment', score: 0, confidence: 0, reason: 'N/A' },
          technical: { name: 'technical', score: 0, confidence: 0, reason: 'N/A' },
          combined: 0,
          recommendation: 'HOLD',
        },
      };

      portfolio.cash += trade.total;
      await addTrade(trade);
      soldPositions.push(`${holding.symbol} (${holding.shares} @ $${quote.price.toFixed(2)})`);
      console.log(`Sold ${holding.symbol}: ${holding.shares} shares at $${quote.price.toFixed(2)}`);
    }

    // Update holdings to only kept positions
    portfolio.holdings = holdingsToKeep;

    // Step 2: Find the strongest buy signals across ALL assets
    const currentHoldings = new Set(portfolio.holdings.map(h => h.symbol));

    const buySignals = Object.values(allSignals)
      .filter(s => s.combined > 0.02 && !currentHoldings.has(s.symbol))
      .sort((a, b) => b.combined - a.combined);

    console.log(`Found ${buySignals.length} potential buy signals`);

    // Step 3: Calculate how many new positions we can open
    const availableSlots = DEFAULT_CONFIG.maxPositions - portfolio.holdings.length;
    const signalsToInvest = buySignals.slice(0, Math.min(availableSlots, 30)); // Max 30 new positions per rebalance

    console.log(`Will invest in top ${signalsToInvest.length} signals`);

    // Step 4: Equal-weight allocation with signal strength boost
    if (signalsToInvest.length > 0 && portfolio.cash > DEFAULT_CONFIG.minTradeValue) {
      const baseAllocation = (portfolio.cash * 0.90) / signalsToInvest.length; // Use 90% of available cash

      for (const signal of signalsToInvest) {
        if (portfolio.cash < DEFAULT_CONFIG.minTradeValue) break;

        // Calculate position size with signal strength multiplier
        const strengthMultiplier = 1.0 + (signal.combined * 0.3);
        const maxPerPosition = portfolio.cash * DEFAULT_CONFIG.maxPositionSize;
        const targetSize = Math.min(baseAllocation * strengthMultiplier, maxPerPosition, portfolio.cash * 0.95);

        if (targetSize < DEFAULT_CONFIG.minTradeValue) continue;

        const quote = await fetchYahooQuote(signal.symbol);
        if (!quote) {
          console.log(`Skipping ${signal.symbol} - could not get quote`);
          continue;
        }

        // Fractional shares
        const shares = Math.round((targetSize / quote.price) * 10000) / 10000;
        if (shares < 0.0001) continue;

        const total = shares * quote.price;

        const trade: Trade = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          symbol: signal.symbol,
          action: 'BUY',
          shares,
          price: quote.price,
          total,
          reason: `REBALANCE: ${signal.recommendation} (score: ${signal.combined.toFixed(3)})`,
          signals: signal,
        };

        const newHolding: Holding = {
          symbol: signal.symbol,
          shares,
          avgCost: quote.price,
          currentPrice: quote.price,
          marketValue: total,
          gainLoss: 0,
          gainLossPercent: 0,
          isExtendedHours: quote.isExtendedHours,
          priceUpdatedAt: new Date().toISOString(),
        };

        portfolio.cash -= total;
        portfolio.holdings.push(newHolding);
        await addTrade(trade);
        boughtPositions.push(`${signal.symbol} (${shares} @ $${quote.price.toFixed(2)}, score: ${signal.combined.toFixed(3)})`);
        console.log(`Bought ${signal.symbol}: ${shares} shares at $${quote.price.toFixed(2)}`);
      }
    }

    // Update portfolio totals
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    portfolio.totalValue = portfolio.cash + holdingsValue;
    portfolio.lastUpdated = new Date().toISOString();

    // Save everything
    await savePortfolio(portfolio);
    await setLastRun(new Date().toISOString());
    await addPortfolioSnapshot({
      timestamp: new Date().toISOString(),
      totalValue: portfolio.totalValue,
    });

    console.log('Portfolio rebalance completed');
    console.log(`Sold: ${soldPositions.length}, Bought: ${boughtPositions.length}`);
    console.log(`New portfolio value: $${portfolio.totalValue.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Rebalanced portfolio: sold ${soldPositions.length}, bought ${boughtPositions.length}`,
        sold: soldPositions,
        bought: boughtPositions,
        portfolio: {
          totalValue: portfolio.totalValue,
          cash: portfolio.cash,
          holdings: portfolio.holdings.length,
        },
        topHoldings: portfolio.holdings
          .sort((a, b) => b.marketValue - a.marketValue)
          .slice(0, 10)
          .map(h => ({
            symbol: h.symbol,
            value: h.marketValue,
            signal: allSignals[h.symbol]?.combined || 0,
          })),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Portfolio rebalance error:', error);
    return new Response(
      JSON.stringify({
        error: 'Rebalance failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

export const prerender = false;
