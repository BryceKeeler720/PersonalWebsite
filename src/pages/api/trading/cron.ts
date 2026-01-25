import type { APIRoute } from 'astro';
import {
  getPortfolio,
  savePortfolio,
  addTrade,
  saveSignals,
  setLastRun,
  addPortfolioSnapshot,
} from '../../../lib/trading/serverStorage';
import { SP500_SYMBOLS } from '../../../lib/trading/sp500';
import { calculateMomentumSignal } from '../../../lib/trading/strategies/momentum';
import { calculateMeanReversionSignal } from '../../../lib/trading/strategies/meanReversion';
import { calculateTechnicalSignal } from '../../../lib/trading/strategies/technical';
import { calculateSentimentSignal, generateMockNews } from '../../../lib/trading/strategies/sentiment';
import { combineSignals, calculatePositionSize } from '../../../lib/trading/signalCombiner';
import { DEFAULT_CONFIG } from '../../../components/trading/types';
import type { Portfolio, Trade, SignalSnapshot, OHLCV, Holding } from '../../../components/trading/types';

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

    // Analyze all S&P 500 stocks in parallel batches
    const stocksToAnalyze = [...SP500_SYMBOLS];
    console.log(`Analyzing ${stocksToAnalyze.length} stocks in batches of ${BATCH_SIZE}...`);

    // Process stocks in parallel batches
    for (let i = 0; i < stocksToAnalyze.length; i += BATCH_SIZE) {
      const batch = stocksToAnalyze.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(stocksToAnalyze.length / BATCH_SIZE);

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
      if (i + BATCH_SIZE < stocksToAnalyze.length) {
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
      }
    }

    // Check for sell signals on holdings
    for (const holding of portfolio.holdings) {
      const signal = allSignals[holding.symbol];
      if (signal && (signal.recommendation === 'SELL' || signal.recommendation === 'STRONG_SELL')) {
        const quote = await fetchYahooQuote(holding.symbol);
        if (quote) {
          // Determine sell percentage based on signal strength
          // STRONG_SELL: sell 100%, SELL: sell 50%
          const sellPercent = signal.recommendation === 'STRONG_SELL' ? 1.0 : 0.5;
          const sharesToSell = Math.max(1, Math.floor(holding.shares * sellPercent));

          const trade: Trade = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            symbol: holding.symbol,
            action: 'SELL',
            shares: sharesToSell,
            price: quote.price,
            total: sharesToSell * quote.price,
            reason: `${signal.recommendation}: Combined score ${signal.combined.toFixed(2)} (selling ${Math.round(sellPercent * 100)}%)`,
            signals: signal,
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
          console.log(`Sold ${trade.shares} shares of ${trade.symbol} at $${trade.price} (${Math.round(sellPercent * 100)}% of position)`);
        }
      }
    }

    // Check for buy signals
    const buyCandidates = Object.values(allSignals)
      .filter(s => s.recommendation === 'BUY' || s.recommendation === 'STRONG_BUY')
      .sort((a, b) => b.combined - a.combined)
      .slice(0, 3);

    for (const signal of buyCandidates) {
      // Skip if already holding
      if (portfolio.holdings.some(h => h.symbol === signal.symbol)) {
        continue;
      }

      // Check position limits
      if (portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions) {
        break;
      }

      // Calculate position size
      const positionSize = calculatePositionSize(signal, portfolio.cash, DEFAULT_CONFIG.maxPositionSize);
      if (positionSize < DEFAULT_CONFIG.minTradeValue) {
        continue;
      }

      const quote = await fetchYahooQuote(signal.symbol);
      if (quote) {
        const shares = Math.floor(positionSize / quote.price);
        if (shares > 0) {
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
