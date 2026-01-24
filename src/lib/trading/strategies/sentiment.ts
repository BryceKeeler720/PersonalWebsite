import type { StrategySignal } from '../../../components/trading/types';

/**
 * Sentiment Analysis Strategy
 * Uses simple word-based sentiment scoring on news headlines.
 *
 * Note: In production, this would use:
 * - NLP models (BERT, FinBERT)
 * - News APIs (NewsAPI, Finnhub)
 * - Social media sentiment (Twitter/X, Reddit)
 *
 * This implementation uses a simplified word-matching approach.
 */

// Positive sentiment indicators
const POSITIVE_WORDS = [
  'surge',
  'soar',
  'jump',
  'gain',
  'rally',
  'rise',
  'growth',
  'profit',
  'beat',
  'exceed',
  'outperform',
  'upgrade',
  'buy',
  'bullish',
  'strong',
  'record',
  'high',
  'breakthrough',
  'success',
  'innovation',
  'expansion',
  'increase',
  'positive',
  'optimistic',
  'boost',
];

// Negative sentiment indicators
const NEGATIVE_WORDS = [
  'plunge',
  'crash',
  'drop',
  'fall',
  'decline',
  'loss',
  'miss',
  'below',
  'downgrade',
  'sell',
  'bearish',
  'weak',
  'fail',
  'concern',
  'risk',
  'warning',
  'cut',
  'layoff',
  'lawsuit',
  'investigation',
  'scandal',
  'negative',
  'pessimistic',
  'decrease',
  'low',
];

// Strong sentiment modifiers
const STRONG_MODIFIERS = ['very', 'extremely', 'significantly', 'sharply', 'dramatically', 'massive'];

export interface NewsItem {
  title: string;
  summary?: string;
  publishedAt: string;
  source?: string;
}

/**
 * Analyze sentiment of a text
 */
function analyzeSentiment(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let hasStrongModifier = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, '');

    // Check for modifiers
    if (STRONG_MODIFIERS.some(m => word.includes(m))) {
      hasStrongModifier = true;
    }

    // Check sentiment
    if (POSITIVE_WORDS.some(pw => word.includes(pw))) {
      score += hasStrongModifier ? 2 : 1;
      hasStrongModifier = false;
    }
    if (NEGATIVE_WORDS.some(nw => word.includes(nw))) {
      score -= hasStrongModifier ? 2 : 1;
      hasStrongModifier = false;
    }
  }

  // Normalize to -1 to 1 range
  return Math.max(-1, Math.min(1, score / 5));
}

/**
 * Calculate sentiment signal from news items
 */
export function calculateSentimentSignal(news: NewsItem[]): StrategySignal {
  if (!news || news.length === 0) {
    return {
      name: 'Sentiment',
      score: 0,
      confidence: 0.2,
      reason: 'No news data available',
    };
  }

  // Analyze each news item with recency weighting
  const now = Date.now();
  let totalScore = 0;
  let totalWeight = 0;

  news.slice(0, 10).forEach((item, index) => {
    const text = item.title + (item.summary ? ' ' + item.summary : '');
    const sentimentScore = analyzeSentiment(text);

    // Weight by recency (exponential decay)
    const ageHours = (now - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    const recencyWeight = Math.exp(-ageHours / 48); // 48-hour half-life

    // Also weight by position (earlier = more recent = higher weight)
    const positionWeight = Math.exp(-index * 0.15);

    const weight = recencyWeight * positionWeight;
    totalScore += sentimentScore * weight;
    totalWeight += weight;
  });

  const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  const normalizedScore = Math.max(-1, Math.min(1, avgScore));

  // Determine sentiment label
  let sentimentLabel: string;
  if (normalizedScore > 0.3) sentimentLabel = 'strongly positive';
  else if (normalizedScore > 0.1) sentimentLabel = 'positive';
  else if (normalizedScore < -0.3) sentimentLabel = 'strongly negative';
  else if (normalizedScore < -0.1) sentimentLabel = 'negative';
  else sentimentLabel = 'neutral';

  // Confidence based on data quality
  const confidence = Math.min(0.7, 0.3 + news.length * 0.04);

  return {
    name: 'Sentiment',
    score: normalizedScore,
    confidence,
    reason: `${sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)} sentiment from ${news.length} articles`,
  };
}

/**
 * Generate mock news for testing when real API is unavailable
 */
export function generateMockNews(symbol: string): NewsItem[] {
  const templates = [
    { title: `${symbol} reports strong quarterly earnings`, sentiment: 'positive' },
    { title: `${symbol} announces new product launch`, sentiment: 'positive' },
    { title: `${symbol} faces regulatory concerns`, sentiment: 'negative' },
    { title: `Analysts upgrade ${symbol} stock rating`, sentiment: 'positive' },
    { title: `${symbol} CEO discusses growth strategy`, sentiment: 'neutral' },
  ];

  // Randomly select 3-5 news items
  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = templates.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((t, i) => ({
    title: t.title,
    publishedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
  }));
}
