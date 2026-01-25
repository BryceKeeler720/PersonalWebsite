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
import { combineSignals } from '../../../lib/trading/signalCombiner';
import { DEFAULT_CONFIG } from '../../../components/trading/types';
import type { Trade, SignalSnapshot, OHLCV, Holding } from '../../../components/trading/types';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// Configuration for batch processing
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 300;

async function fetchYahooQuote(symbol: string): Promise<{ price: number } | null> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbol}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible)',
        },
      }
    );
    const data = await response.json();
    const result = data?.quoteResponse?.result?.[0];
    if (result) {
      return { price: result.regularMarketPrice };
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
    console.log('Starting portfolio initialization...');

    // Get current portfolio
    let portfolio = await getPortfolio();
    const allSignals: Record<string, SignalSnapshot> = {};

    // Analyze all S&P 500 stocks in parallel batches
    const stocksToAnalyze = [...SP500_SYMBOLS];
    console.log(`Analyzing ${stocksToAnalyze.length} stocks for initialization...`);

    // Process stocks in parallel batches
    for (let i = 0; i < stocksToAnalyze.length; i += BATCH_SIZE) {
      const batch = stocksToAnalyze.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(stocksToAnalyze.length / BATCH_SIZE);

      console.log(`Processing batch ${batchNumber}/${totalBatches}`);

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

      for (const { symbol, signal } of batchResults) {
        if (signal) {
          allSignals[symbol] = signal;
        }
      }

      if (i + BATCH_SIZE < stocksToAnalyze.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(`Successfully analyzed ${Object.keys(allSignals).length} stocks`);

    // Find all buy signals, sorted by combined score (strongest first)
    const buySignals = Object.values(allSignals)
      .filter(s => s.recommendation === 'BUY' || s.recommendation === 'STRONG_BUY')
      .sort((a, b) => b.combined - a.combined);

    console.log(`Found ${buySignals.length} buy signals`);

    if (buySignals.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No buy signals found',
          signalsAnalyzed: Object.keys(allSignals).length,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Calculate how many positions we can open
    const availableSlots = DEFAULT_CONFIG.maxPositions - portfolio.holdings.length;
    const signalsToInvest = buySignals.slice(0, Math.min(availableSlots, buySignals.length));

    console.log(`Will invest in top ${signalsToInvest.length} signals`);

    // Calculate weighted position sizes based on signal strength
    // Stronger signals get proportionally more investment
    const totalScore = signalsToInvest.reduce((sum, s) => sum + s.combined, 0);
    const trades: Trade[] = [];

    for (const signal of signalsToInvest) {
      // Skip if already holding
      if (portfolio.holdings.some(h => h.symbol === signal.symbol)) {
        console.log(`Skipping ${signal.symbol} - already holding`);
        continue;
      }

      // Calculate weighted position size
      // Each signal gets a portion of available cash proportional to its score
      const scoreWeight = signal.combined / totalScore;
      const maxPerPosition = portfolio.cash * DEFAULT_CONFIG.maxPositionSize;
      const weightedSize = Math.min(
        portfolio.cash * scoreWeight * 0.9, // Use 90% of weighted allocation (leave some buffer)
        maxPerPosition
      );

      if (weightedSize < DEFAULT_CONFIG.minTradeValue) {
        console.log(`Skipping ${signal.symbol} - position size too small: $${weightedSize.toFixed(2)}`);
        continue;
      }

      const quote = await fetchYahooQuote(signal.symbol);
      if (!quote) {
        console.log(`Skipping ${signal.symbol} - could not get quote`);
        continue;
      }

      const shares = Math.floor(weightedSize / quote.price);
      if (shares <= 0) {
        console.log(`Skipping ${signal.symbol} - cannot afford any shares at $${quote.price}`);
        continue;
      }

      const total = shares * quote.price;

      const trade: Trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: signal.symbol,
        action: 'BUY',
        shares,
        price: quote.price,
        total,
        reason: `INIT ${signal.recommendation}: Score ${signal.combined.toFixed(3)} (weighted allocation)`,
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
      trades.push(trade);

      // Save each trade
      await addTrade(trade);

      console.log(`Bought ${shares} shares of ${signal.symbol} at $${quote.price.toFixed(2)} (score: ${signal.combined.toFixed(3)})`);
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

    console.log('Portfolio initialization completed');
    console.log(`Portfolio value: $${portfolio.totalValue.toFixed(2)}`);
    console.log(`Cash remaining: $${portfolio.cash.toFixed(2)}`);
    console.log(`Positions: ${portfolio.holdings.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Initialized portfolio with ${trades.length} positions`,
        portfolio: {
          totalValue: portfolio.totalValue,
          cash: portfolio.cash,
          holdings: portfolio.holdings.length,
        },
        trades: trades.map(t => ({
          symbol: t.symbol,
          shares: t.shares,
          price: t.price,
          total: t.total,
          score: t.signals.combined,
        })),
        signalsAnalyzed: Object.keys(allSignals).length,
        buySignalsFound: buySignals.length,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Portfolio initialization error:', error);
    return new Response(
      JSON.stringify({
        error: 'Initialization failed',
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
