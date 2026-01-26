import type { APIRoute } from 'astro';
import {
  getPortfolio,
  savePortfolio,
  addTrade,
  saveSignals,
  setLastRun,
  addPortfolioSnapshot,
} from '../../../lib/trading/serverStorage';
import {
  CRYPTO_SYMBOLS,
  FOREX_SYMBOLS,
  FUTURES_SYMBOLS,
  SP500_SYMBOLS,
  NASDAQ_ADDITIONAL,
} from '../../../lib/trading/assets';
import { calculateMomentumSignal } from '../../../lib/trading/strategies/momentum';
import { calculateMeanReversionSignal } from '../../../lib/trading/strategies/meanReversion';
import { calculateTechnicalSignal } from '../../../lib/trading/strategies/technical';
import { calculateSentimentSignal, generateMockNews } from '../../../lib/trading/strategies/sentiment';
import { combineSignals, calculatePositionSize } from '../../../lib/trading/signalCombiner';
import { DEFAULT_CONFIG } from '../../../components/trading/types';
import type { Trade, SignalSnapshot, OHLCV, Holding } from '../../../components/trading/types';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// Configuration for batch processing
const BATCH_SIZE = 15; // Number of stocks to analyze in parallel
const BATCH_DELAY_MS = 500; // Delay between batches to avoid rate limiting

async function fetchYahooQuote(symbol: string): Promise<{ price: number; isExtendedHours: boolean } | null> {
  try {
    // Use the chart endpoint with pre/post market data included
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

    // Try to get the most recent price from the data
    // Check if we have intraday data with pre/post market
    if (quotes?.close && timestamps && timestamps.length > 0) {
      // Find the last valid close price
      for (let i = quotes.close.length - 1; i >= 0; i--) {
        if (quotes.close[i] !== null) {
          const lastTimestamp = timestamps[i];
          const tradingPeriod = meta.currentTradingPeriod;

          // Determine if this is extended hours
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

    // Fallback to regular market price
    if (meta.regularMarketPrice) {
      return { price: meta.regularMarketPrice, isExtendedHours: false };
    }

    return null;
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

async function fetchYahooHistorical(symbol: string): Promise<OHLCV[] | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible)',
        },
      }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return null;
    }

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];

    return timestamp
      .map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      }))
      .filter(
        (d: OHLCV) =>
          d.open !== null && d.high !== null && d.low !== null && d.close !== null
      );
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error);
    return null;
  }
}

async function analyzeStock(symbol: string): Promise<SignalSnapshot | null> {
  const historicalData = await fetchYahooHistorical(symbol);
  if (!historicalData || historicalData.length < 50) {
    return null;
  }

  const momentum = calculateMomentumSignal(historicalData);
  const meanReversion = calculateMeanReversionSignal(historicalData);
  const technical = calculateTechnicalSignal(historicalData);
  const mockNews = generateMockNews(symbol);
  const sentiment = calculateSentimentSignal(mockNews);

  return combineSignals(
    symbol,
    momentum,
    meanReversion,
    sentiment,
    technical,
    DEFAULT_CONFIG.strategyWeights
  );
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
    console.log('Starting trading bot cron job...');

    // Get current portfolio
    let portfolio = await getPortfolio();
    const allSignals: Record<string, SignalSnapshot> = {};

    // Determine which assets to analyze based on current time
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Build list of assets to analyze
    let assetsToAnalyze: string[] = [];

    // Crypto trades 24/7 - always include
    assetsToAnalyze.push(...CRYPTO_SYMBOLS);

    // Stocks, forex, and futures only trade on weekdays
    if (!isWeekend) {
      assetsToAnalyze.push(...SP500_SYMBOLS);
      assetsToAnalyze.push(...NASDAQ_ADDITIONAL);
      assetsToAnalyze.push(...FOREX_SYMBOLS);
      assetsToAnalyze.push(...FUTURES_SYMBOLS);
    }

    console.log(`Analyzing ${assetsToAnalyze.length} assets in batches of ${BATCH_SIZE}...`);
    console.log(`Weekend: ${isWeekend}, Crypto: ${CRYPTO_SYMBOLS.length}, Stocks: ${isWeekend ? 0 : SP500_SYMBOLS.length + NASDAQ_ADDITIONAL.length}`);

    // Process stocks in parallel batches
    for (let i = 0; i < assetsToAnalyze.length; i += BATCH_SIZE) {
      const batch = assetsToAnalyze.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(assetsToAnalyze.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches}: ${batch.join(', ')}`);

      // Analyze batch in parallel
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const signal = await analyzeStock(symbol);
            return { symbol, signal };
          } catch (error) {
            console.error(`Error analyzing ${symbol}:`, error);
            return { symbol, signal: null };
          }
        })
      );

      // Collect results
      for (const { symbol, signal } of batchResults) {
        if (signal) {
          allSignals[symbol] = signal;
        }
      }

      // Delay between batches to avoid rate limiting (skip delay on last batch)
      if (i + BATCH_SIZE < assetsToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`Successfully analyzed ${Object.keys(allSignals).length} stocks`);

    // Update holding prices
    for (const holding of portfolio.holdings) {
      const quote = await fetchYahooQuote(holding.symbol);
      if (quote) {
        holding.currentPrice = quote.price;
        holding.marketValue = holding.shares * quote.price;
        holding.gainLoss = (quote.price - holding.avgCost) * holding.shares;
        holding.gainLossPercent = ((quote.price - holding.avgCost) / holding.avgCost) * 100;
        holding.isExtendedHours = quote.isExtendedHours;
        holding.priceUpdatedAt = new Date().toISOString();
      }
    }

    // Check for sell signals on holdings (signal-based + profit-taking + stop-loss)
    for (const holding of portfolio.holdings) {
      const signal = allSignals[holding.symbol];
      const quote = await fetchYahooQuote(holding.symbol);
      if (!quote) continue;

      // Update holding with latest price
      holding.currentPrice = quote.price;
      holding.marketValue = holding.shares * quote.price;
      holding.gainLoss = (quote.price - holding.avgCost) * holding.shares;
      holding.gainLossPercent = ((quote.price - holding.avgCost) / holding.avgCost) * 100;

      let sellPercent = 0;
      let sellReason = '';

      // Priority 1: No signal data - sell all (asset not in current analysis set)
      if (!signal) {
        sellPercent = 1.0;
        sellReason = `No signal data - rotating out`;
      }
      // Priority 2: Strong sell signal - sell all
      else if (signal.recommendation === 'STRONG_SELL') {
        sellPercent = 1.0;
        sellReason = `STRONG_SELL signal: score ${signal.combined.toFixed(2)}`;
      }
      // Priority 3: Stop loss at -3% - sell all to limit losses
      else if (holding.gainLossPercent <= -3) {
        sellPercent = 1.0;
        sellReason = `Stop loss triggered at ${holding.gainLossPercent.toFixed(1)}%`;
      }
      // Priority 4: Weak signal below buy threshold - sell all to free capital
      else if (signal.combined < 0.02) {
        sellPercent = 1.0;
        sellReason = `Weak signal (${signal.combined.toFixed(3)}) - rotating to stronger positions`;
      }
      // Priority 5: Take profit at +4% - sell half to lock in gains
      else if (holding.gainLossPercent >= 4) {
        sellPercent = 0.5;
        sellReason = `Taking profits at ${holding.gainLossPercent.toFixed(1)}%`;
      }
      // Priority 6: Regular sell signal - sell half
      else if (signal.recommendation === 'SELL') {
        sellPercent = 0.5;
        sellReason = `SELL signal: score ${signal.combined.toFixed(2)}`;
      }

      if (sellPercent > 0) {
        // Support fractional shares - round to 4 decimal places
        const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;

        // Create a placeholder signal for non-signal-based sells
        const tradeSignal: SignalSnapshot = signal || {
          symbol: holding.symbol,
          timestamp: new Date().toISOString(),
          momentum: { name: 'momentum', score: 0, confidence: 0, reason: 'N/A' },
          meanReversion: { name: 'meanReversion', score: 0, confidence: 0, reason: 'N/A' },
          sentiment: { name: 'sentiment', score: 0, confidence: 0, reason: 'N/A' },
          technical: { name: 'technical', score: 0, confidence: 0, reason: 'N/A' },
          combined: 0,
          recommendation: 'HOLD',
        };

        const trade: Trade = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          symbol: holding.symbol,
          action: 'SELL',
          shares: sharesToSell,
          price: quote.price,
          total: sharesToSell * quote.price,
          reason: sellReason,
          signals: tradeSignal,
        };

        portfolio.cash += trade.total;

        // Update or remove holding
        if (sharesToSell >= holding.shares) {
          // Sold all shares, remove holding
          portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
        } else {
          // Partial sell, update holding
          holding.shares -= sharesToSell;
          holding.marketValue = holding.shares * quote.price;
          holding.gainLoss = (quote.price - holding.avgCost) * holding.shares;
          holding.gainLossPercent = ((quote.price - holding.avgCost) / holding.avgCost) * 100;
        }

        await addTrade(trade);
        console.log(`Sold ${trade.shares} shares of ${trade.symbol} at $${trade.price}: ${sellReason}`);
      }
    }

    // Check for buy signals - consider many candidates for high-frequency trading
    // Include any stock with positive combined score (not just BUY/STRONG_BUY)
    const buyCandidates = Object.values(allSignals)
      .filter(s => s.combined > 0.02) // Very low threshold - any slightly positive signal
      .sort((a, b) => b.combined - a.combined)
      .slice(0, 20); // Consider up to 20 candidates per run

    for (const signal of buyCandidates) {
      // Skip if already holding
      if (portfolio.holdings.some(h => h.symbol === signal.symbol)) {
        continue;
      }

      // Check position limits
      if (portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions) {
        break;
      }

      // Calculate position size - deploy excess cash more aggressively
      const positionSize = calculatePositionSize(
        signal,
        portfolio.cash,
        DEFAULT_CONFIG.maxPositionSize,
        portfolio.totalValue,
        DEFAULT_CONFIG.targetCashRatio
      );
      if (positionSize < DEFAULT_CONFIG.minTradeValue) {
        continue;
      }

      const quote = await fetchYahooQuote(signal.symbol);
      if (quote) {
        // Use fractional shares - round to 4 decimal places for precision
        const shares = Math.round((positionSize / quote.price) * 10000) / 10000;
        if (shares >= 0.0001) {
          const total = shares * quote.price;

          const trade: Trade = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            symbol: signal.symbol,
            action: 'BUY',
            shares,
            price: quote.price,
            total,
            reason: `${signal.recommendation}: Combined score ${signal.combined.toFixed(2)}`,
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
          console.log(`Bought ${shares} shares of ${signal.symbol} at $${quote.price}`);
        }
      }
    }

    // Update portfolio totals
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    portfolio.totalValue = portfolio.cash + holdingsValue;
    portfolio.lastUpdated = new Date().toISOString();

    // Save everything
    await savePortfolio(portfolio);
    await saveSignals(allSignals);
    await setLastRun(new Date().toISOString());

    // Save portfolio snapshot for history chart
    await addPortfolioSnapshot({
      timestamp: new Date().toISOString(),
      totalValue: portfolio.totalValue,
    });

    console.log('Trading bot cron job completed successfully');
    console.log(`Portfolio value: $${portfolio.totalValue.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        portfolio: {
          totalValue: portfolio.totalValue,
          cash: portfolio.cash,
          holdings: portfolio.holdings.length,
        },
        signalsAnalyzed: Object.keys(allSignals).length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Trading bot cron error:', error);
    return new Response(
      JSON.stringify({
        error: 'Cron job failed',
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
