import { g as getPortfolio, a as addTrade, s as savePortfolio, b as saveSignals, c as setLastRun, d as addPortfolioSnapshot } from '../../../chunks/serverStorage_BnY9VIjj.mjs';
import { S as SP500_SYMBOLS } from '../../../chunks/sp500_YCrYHr9E.mjs';
import { D as DEFAULT_CONFIG } from '../../../chunks/types_vTnG2Q7D.mjs';
export { renderers } from '../../../renderers.mjs';

function calculateSMA(prices, period) {
  if (prices.length < period) return [];
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}
function calculateEMA(prices, period) {
  if (prices.length < period) return [];
  const multiplier = 2 / (period + 1);
  const firstSMA = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const ema = [firstSMA];
  for (let i = period; i < prices.length; i++) {
    const newEMA = (prices[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(newEMA);
  }
  return ema;
}
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return [];
  const changes = prices.slice(1).map((p, i) => p - prices[i]);
  const gains = changes.map((c) => c > 0 ? c : 0);
  const losses = changes.map((c) => c < 0 ? -c : 0);
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const rsi = [];
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }
  return rsi;
}
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(prices, fastPeriod);
  const emaSlow = calculateEMA(prices, slowPeriod);
  if (emaSlow.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }
  const offset = slowPeriod - fastPeriod;
  const macd = emaFast.slice(offset).map((fast, i) => fast - emaSlow[i]);
  if (macd.length < signalPeriod) {
    return { macd, signal: [], histogram: [] };
  }
  const signal = calculateEMA(macd, signalPeriod);
  const macdForHistogram = macd.slice(signalPeriod - 1);
  const histogram = macdForHistogram.map((m, i) => m - signal[i]);
  return { macd, signal, histogram };
}
function calculateBollingerBands(prices, period = 20, stdDevMultiplier = 2) {
  const middle = calculateSMA(prices, period);
  if (middle.length === 0) {
    return { upper: [], middle: [], lower: [] };
  }
  const upper = [];
  const lower = [];
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = middle[i - period + 1];
    const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + stdDevMultiplier * std);
    lower.push(mean - stdDevMultiplier * std);
  }
  return { upper, middle, lower };
}
function calculateStdDev(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}
function calculateZScore(value, mean, stdDev) {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function calculateMomentumSignal(data) {
  if (data.length < 50) {
    return {
      name: "Momentum",
      score: 0,
      confidence: 0.1,
      reason: "Insufficient data for momentum analysis"
    };
  }
  const closes = data.map((d) => d.close);
  const currentPrice = closes[closes.length - 1];
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  if (sma20.length === 0 || sma50.length === 0) {
    return {
      name: "Momentum",
      score: 0,
      confidence: 0.1,
      reason: "Unable to calculate moving averages"
    };
  }
  const currentSma20 = sma20[sma20.length - 1];
  const currentSma50 = sma50[sma50.length - 1];
  const rsi = calculateRSI(closes, 14);
  const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
  let score = 0;
  const reasons = [];
  const maCrossoverRatio = (currentSma20 - currentSma50) / currentSma50;
  if (currentSma20 > currentSma50) {
    const maScore = Math.min(0.35, maCrossoverRatio * 10);
    score += maScore;
    reasons.push(`SMA20 > SMA50 (bullish trend)`);
  } else {
    const maScore = Math.max(-0.35, maCrossoverRatio * 10);
    score += maScore;
    reasons.push(`SMA20 < SMA50 (bearish trend)`);
  }
  const priceVsSma20 = (currentPrice - currentSma20) / currentSma20;
  if (priceVsSma20 > 0.02) {
    score += Math.min(0.25, priceVsSma20 * 5);
    reasons.push(`Price ${(priceVsSma20 * 100).toFixed(1)}% above SMA20`);
  } else if (priceVsSma20 < -0.02) {
    score += Math.max(-0.25, priceVsSma20 * 5);
    reasons.push(`Price ${(Math.abs(priceVsSma20) * 100).toFixed(1)}% below SMA20`);
  }
  if (currentRsi < 30) {
    score += 0.4;
    reasons.push(`RSI oversold at ${currentRsi.toFixed(1)}`);
  } else if (currentRsi < 40) {
    score += 0.2;
    reasons.push(`RSI low at ${currentRsi.toFixed(1)}`);
  } else if (currentRsi > 70) {
    score -= 0.4;
    reasons.push(`RSI overbought at ${currentRsi.toFixed(1)}`);
  } else if (currentRsi > 60) {
    score -= 0.2;
    reasons.push(`RSI high at ${currentRsi.toFixed(1)}`);
  }
  score = Math.max(-1, Math.min(1, score));
  let confidence = 0.5;
  if (Math.abs(score) > 0.6) confidence = 0.85;
  else if (Math.abs(score) > 0.4) confidence = 0.7;
  else if (Math.abs(score) > 0.2) confidence = 0.55;
  return {
    name: "Momentum",
    score,
    confidence,
    reason: reasons.join("; ")
  };
}

function calculateMeanReversionSignal(data) {
  if (data.length < 50) {
    return {
      name: "Mean Reversion",
      score: 0,
      confidence: 0.1,
      reason: "Insufficient data for mean reversion analysis"
    };
  }
  const closes = data.map((d) => d.close);
  const currentPrice = closes[closes.length - 1];
  const bb = calculateBollingerBands(closes, 20, 2);
  if (bb.upper.length === 0 || bb.lower.length === 0) {
    return {
      name: "Mean Reversion",
      score: 0,
      confidence: 0.1,
      reason: "Unable to calculate Bollinger Bands"
    };
  }
  const upperBand = bb.upper[bb.upper.length - 1];
  const lowerBand = bb.lower[bb.lower.length - 1];
  bb.middle[bb.middle.length - 1];
  const sma50 = calculateSMA(closes, 50);
  const currentSma50 = sma50[sma50.length - 1];
  const recentCloses = closes.slice(-50);
  const stdDev = calculateStdDev(recentCloses);
  const zScore = calculateZScore(currentPrice, currentSma50, stdDev);
  let score = 0;
  const reasons = [];
  const bandWidth = upperBand - lowerBand;
  const bbPosition = (currentPrice - lowerBand) / bandWidth;
  if (currentPrice < lowerBand) {
    const deviation = (lowerBand - currentPrice) / bandWidth;
    score += Math.min(0.5, 0.4 + deviation * 0.5);
    reasons.push(`Price below lower Bollinger Band (oversold)`);
  } else if (currentPrice > upperBand) {
    const deviation = (currentPrice - upperBand) / bandWidth;
    score -= Math.min(0.5, 0.4 + deviation * 0.5);
    reasons.push(`Price above upper Bollinger Band (overbought)`);
  } else if (bbPosition < 0.25) {
    score += 0.25;
    reasons.push(`Price in lower 25% of Bollinger Bands`);
  } else if (bbPosition > 0.75) {
    score -= 0.25;
    reasons.push(`Price in upper 25% of Bollinger Bands`);
  }
  if (zScore < -2) {
    score += 0.5;
    reasons.push(`Z-score ${zScore.toFixed(2)} (significantly below mean)`);
  } else if (zScore < -1) {
    score += 0.25;
    reasons.push(`Z-score ${zScore.toFixed(2)} (below mean)`);
  } else if (zScore > 2) {
    score -= 0.5;
    reasons.push(`Z-score ${zScore.toFixed(2)} (significantly above mean)`);
  } else if (zScore > 1) {
    score -= 0.25;
    reasons.push(`Z-score ${zScore.toFixed(2)} (above mean)`);
  }
  score = Math.max(-1, Math.min(1, score));
  let confidence = 0.5;
  if (Math.abs(zScore) > 2) confidence = 0.8;
  else if (Math.abs(zScore) > 1.5) confidence = 0.7;
  else if (Math.abs(zScore) > 1) confidence = 0.6;
  return {
    name: "Mean Reversion",
    score,
    confidence,
    reason: reasons.join("; ")
  };
}

function calculateTechnicalSignal(data) {
  if (data.length < 30) {
    return {
      name: "Technical",
      score: 0,
      confidence: 0.1,
      reason: "Insufficient data for technical analysis"
    };
  }
  const closes = data.map((d) => d.close);
  const volumes = data.map((d) => d.volume);
  const { macd, signal, histogram } = calculateMACD(closes, 12, 26, 9);
  if (macd.length < 2 || signal.length < 2 || histogram.length < 2) {
    return {
      name: "Technical",
      score: 0,
      confidence: 0.1,
      reason: "Unable to calculate MACD"
    };
  }
  const currentMacd = macd[macd.length - 1];
  const currentSignal = signal[signal.length - 1];
  const currentHistogram = histogram[histogram.length - 1];
  const prevHistogram = histogram[histogram.length - 2];
  const rsi = calculateRSI(closes, 14);
  const currentRsi = rsi.length > 0 ? rsi[rsi.length - 1] : 50;
  const avgVolume = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const currentVolume = volumes[volumes.length - 1];
  const volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;
  let score = 0;
  const reasons = [];
  if (currentMacd > currentSignal) {
    if (macd[macd.length - 2] <= signal[signal.length - 2]) {
      score += 0.35;
      reasons.push("MACD bullish crossover");
    } else {
      score += 0.15;
      reasons.push("MACD above signal line");
    }
  } else {
    if (macd[macd.length - 2] >= signal[signal.length - 2]) {
      score -= 0.35;
      reasons.push("MACD bearish crossover");
    } else {
      score -= 0.15;
      reasons.push("MACD below signal line");
    }
  }
  if (currentHistogram > 0 && currentHistogram > prevHistogram) {
    score += 0.2;
    reasons.push("MACD histogram rising");
  } else if (currentHistogram < 0 && currentHistogram < prevHistogram) {
    score -= 0.2;
    reasons.push("MACD histogram falling");
  }
  if (currentRsi < 35) {
    score += 0.25;
    reasons.push(`RSI oversold (${currentRsi.toFixed(1)})`);
  } else if (currentRsi < 45) {
    score += 0.1;
  } else if (currentRsi > 65) {
    score -= 0.25;
    reasons.push(`RSI overbought (${currentRsi.toFixed(1)})`);
  } else if (currentRsi > 55) {
    score -= 0.1;
  }
  if (volumeRatio > 1.5) {
    score *= 1.2;
    reasons.push(`High volume (${(volumeRatio * 100).toFixed(0)}% of avg)`);
  } else if (volumeRatio < 0.5) {
    score *= 0.8;
    reasons.push(`Low volume (${(volumeRatio * 100).toFixed(0)}% of avg)`);
  }
  score = Math.max(-1, Math.min(1, score));
  let confidence = 0.6;
  const signalCount = reasons.length;
  if (signalCount >= 4) confidence = 0.85;
  else if (signalCount >= 3) confidence = 0.75;
  else if (signalCount >= 2) confidence = 0.65;
  return {
    name: "Technical",
    score,
    confidence,
    reason: reasons.join("; ") || "Neutral technical indicators"
  };
}

const POSITIVE_WORDS = [
  "surge",
  "soar",
  "jump",
  "gain",
  "rally",
  "rise",
  "growth",
  "profit",
  "beat",
  "exceed",
  "outperform",
  "upgrade",
  "buy",
  "bullish",
  "strong",
  "record",
  "high",
  "breakthrough",
  "success",
  "innovation",
  "expansion",
  "increase",
  "positive",
  "optimistic",
  "boost"
];
const NEGATIVE_WORDS = [
  "plunge",
  "crash",
  "drop",
  "fall",
  "decline",
  "loss",
  "miss",
  "below",
  "downgrade",
  "sell",
  "bearish",
  "weak",
  "fail",
  "concern",
  "risk",
  "warning",
  "cut",
  "layoff",
  "lawsuit",
  "investigation",
  "scandal",
  "negative",
  "pessimistic",
  "decrease",
  "low"
];
const STRONG_MODIFIERS = ["very", "extremely", "significantly", "sharply", "dramatically", "massive"];
function analyzeSentiment(text) {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let hasStrongModifier = false;
  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, "");
    if (STRONG_MODIFIERS.some((m) => word.includes(m))) {
      hasStrongModifier = true;
    }
    if (POSITIVE_WORDS.some((pw) => word.includes(pw))) {
      score += hasStrongModifier ? 2 : 1;
      hasStrongModifier = false;
    }
    if (NEGATIVE_WORDS.some((nw) => word.includes(nw))) {
      score -= hasStrongModifier ? 2 : 1;
      hasStrongModifier = false;
    }
  }
  return Math.max(-1, Math.min(1, score / 5));
}
function calculateSentimentSignal(news) {
  if (!news || news.length === 0) {
    return {
      name: "Sentiment",
      score: 0,
      confidence: 0.2,
      reason: "No news data available"
    };
  }
  const now = Date.now();
  let totalScore = 0;
  let totalWeight = 0;
  news.slice(0, 10).forEach((item, index) => {
    const text = item.title + (item.summary ? " " + item.summary : "");
    const sentimentScore = analyzeSentiment(text);
    const ageHours = (now - new Date(item.publishedAt).getTime()) / (1e3 * 60 * 60);
    const recencyWeight = Math.exp(-ageHours / 48);
    const positionWeight = Math.exp(-index * 0.15);
    const weight = recencyWeight * positionWeight;
    totalScore += sentimentScore * weight;
    totalWeight += weight;
  });
  const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  const normalizedScore = Math.max(-1, Math.min(1, avgScore));
  let sentimentLabel;
  if (normalizedScore > 0.3) sentimentLabel = "strongly positive";
  else if (normalizedScore > 0.1) sentimentLabel = "positive";
  else if (normalizedScore < -0.3) sentimentLabel = "strongly negative";
  else if (normalizedScore < -0.1) sentimentLabel = "negative";
  else sentimentLabel = "neutral";
  const confidence = Math.min(0.7, 0.3 + news.length * 0.04);
  return {
    name: "Sentiment",
    score: normalizedScore,
    confidence,
    reason: `${sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)} sentiment from ${news.length} articles`
  };
}
function generateMockNews(symbol) {
  const templates = [
    { title: `${symbol} reports strong quarterly earnings`, sentiment: "positive" },
    { title: `${symbol} announces new product launch`, sentiment: "positive" },
    { title: `${symbol} faces regulatory concerns`, sentiment: "negative" },
    { title: `Analysts upgrade ${symbol} stock rating`, sentiment: "positive" },
    { title: `${symbol} CEO discusses growth strategy`, sentiment: "neutral" }
  ];
  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = templates.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((t, i) => ({
    title: t.title,
    publishedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1e3).toISOString()
  }));
}

const DEFAULT_WEIGHTS = {
  momentum: 0.3,
  meanReversion: 0.25,
  sentiment: 0.15,
  technical: 0.3
};
function combineSignals(symbol, momentum, meanReversion, sentiment, technical, weights = DEFAULT_WEIGHTS) {
  const totalWeight = weights.momentum + weights.meanReversion + weights.sentiment + weights.technical;
  const normalizedWeights = {
    momentum: weights.momentum / totalWeight,
    meanReversion: weights.meanReversion / totalWeight,
    sentiment: weights.sentiment / totalWeight,
    technical: weights.technical / totalWeight
  };
  const weightedScore = momentum.score * momentum.confidence * normalizedWeights.momentum + meanReversion.score * meanReversion.confidence * normalizedWeights.meanReversion + sentiment.score * sentiment.confidence * normalizedWeights.sentiment + technical.score * technical.confidence * normalizedWeights.technical;
  const totalConfidence = momentum.confidence * normalizedWeights.momentum + meanReversion.confidence * normalizedWeights.meanReversion + sentiment.confidence * normalizedWeights.sentiment + technical.confidence * normalizedWeights.technical;
  const combined = totalConfidence > 0 ? weightedScore / totalConfidence : 0;
  const recommendation = getRecommendation(combined);
  return {
    symbol,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    momentum,
    meanReversion,
    sentiment,
    technical,
    combined,
    recommendation
  };
}
function getRecommendation(score) {
  if (score > 0.6) return "STRONG_BUY";
  if (score > 0.25) return "BUY";
  if (score < -0.6) return "STRONG_SELL";
  if (score < -0.25) return "SELL";
  return "HOLD";
}
function calculatePositionSize(signal, availableCash, maxPositionPercent = 0.2) {
  const baseSize = availableCash * maxPositionPercent;
  const strengthMultiplier = 0.5 + Math.abs(signal.combined) * 0.5;
  return baseSize * strengthMultiplier;
}

const CRON_SECRET = process.env.CRON_SECRET;
async function fetchYahooQuote(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/quote?symbols=${symbol}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible)"
        }
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
async function fetchYahooHistorical(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible)"
        }
      }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result || !result.timestamp || !result.indicators?.quote?.[0]) {
      return null;
    }
    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];
    return timestamp.map((ts, i) => ({
      date: new Date(ts * 1e3).toISOString().split("T")[0],
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      volume: quote.volume[i]
    })).filter(
      (d) => d.open !== null && d.high !== null && d.low !== null && d.close !== null
    );
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error);
    return null;
  }
}
async function analyzeStock(symbol) {
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
const GET = async ({ request }) => {
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    console.log("Starting trading bot cron job...");
    let portfolio = await getPortfolio();
    const allSignals = {};
    const stocksToAnalyze = SP500_SYMBOLS.slice(0, 20);
    console.log(`Analyzing ${stocksToAnalyze.length} stocks...`);
    for (const symbol of stocksToAnalyze) {
      const signal = await analyzeStock(symbol);
      if (signal) {
        allSignals[symbol] = signal;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    for (const holding of portfolio.holdings) {
      const quote = await fetchYahooQuote(holding.symbol);
      if (quote) {
        holding.currentPrice = quote.price;
        holding.marketValue = holding.shares * quote.price;
        holding.gainLoss = (quote.price - holding.avgCost) * holding.shares;
        holding.gainLossPercent = (quote.price - holding.avgCost) / holding.avgCost * 100;
      }
    }
    for (const holding of portfolio.holdings) {
      const signal = allSignals[holding.symbol];
      if (signal && (signal.recommendation === "SELL" || signal.recommendation === "STRONG_SELL")) {
        const quote = await fetchYahooQuote(holding.symbol);
        if (quote) {
          const trade = {
            id: crypto.randomUUID(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            symbol: holding.symbol,
            action: "SELL",
            shares: holding.shares,
            price: quote.price,
            total: holding.shares * quote.price,
            reason: `${signal.recommendation}: Combined score ${signal.combined.toFixed(2)}`,
            signals: signal
          };
          portfolio.cash += trade.total;
          portfolio.holdings = portfolio.holdings.filter((h) => h.symbol !== holding.symbol);
          await addTrade(trade);
          console.log(`Sold ${trade.shares} shares of ${trade.symbol} at $${trade.price}`);
        }
      }
    }
    const buyCandidates = Object.values(allSignals).filter((s) => s.recommendation === "BUY" || s.recommendation === "STRONG_BUY").sort((a, b) => b.combined - a.combined).slice(0, 3);
    for (const signal of buyCandidates) {
      if (portfolio.holdings.some((h) => h.symbol === signal.symbol)) {
        continue;
      }
      if (portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions) {
        break;
      }
      const positionSize = calculatePositionSize(signal, portfolio.cash, DEFAULT_CONFIG.maxPositionSize);
      if (positionSize < DEFAULT_CONFIG.minTradeValue) {
        continue;
      }
      const quote = await fetchYahooQuote(signal.symbol);
      if (quote) {
        const shares = Math.floor(positionSize / quote.price);
        if (shares > 0) {
          const total = shares * quote.price;
          const trade = {
            id: crypto.randomUUID(),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            symbol: signal.symbol,
            action: "BUY",
            shares,
            price: quote.price,
            total,
            reason: `${signal.recommendation}: Combined score ${signal.combined.toFixed(2)}`,
            signals: signal
          };
          const newHolding = {
            symbol: signal.symbol,
            shares,
            avgCost: quote.price,
            currentPrice: quote.price,
            marketValue: total,
            gainLoss: 0,
            gainLossPercent: 0
          };
          portfolio.cash -= total;
          portfolio.holdings.push(newHolding);
          await addTrade(trade);
          console.log(`Bought ${shares} shares of ${signal.symbol} at $${quote.price}`);
        }
      }
    }
    const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
    portfolio.totalValue = portfolio.cash + holdingsValue;
    portfolio.lastUpdated = (/* @__PURE__ */ new Date()).toISOString();
    await savePortfolio(portfolio);
    await saveSignals(allSignals);
    await setLastRun((/* @__PURE__ */ new Date()).toISOString());
    await addPortfolioSnapshot({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      totalValue: portfolio.totalValue
    });
    console.log("Trading bot cron job completed successfully");
    console.log(`Portfolio value: $${portfolio.totalValue.toFixed(2)}`);
    return new Response(
      JSON.stringify({
        success: true,
        portfolio: {
          totalValue: portfolio.totalValue,
          cash: portfolio.cash,
          holdings: portfolio.holdings.length
        },
        signalsAnalyzed: Object.keys(allSignals).length,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    console.error("Trading bot cron error:", error);
    return new Response(
      JSON.stringify({
        error: "Cron job failed",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
const prerender = false;

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
