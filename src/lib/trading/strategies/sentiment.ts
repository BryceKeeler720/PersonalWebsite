import type { StrategySignal } from '../../../components/trading/types';

const POSITIVE_WORDS = [
  'surge', 'soar', 'jump', 'gain', 'rally', 'rise', 'growth', 'profit',
  'beat', 'exceed', 'outperform', 'upgrade', 'buy', 'bullish', 'strong',
  'record', 'high', 'breakthrough', 'success', 'innovation', 'expansion',
  'increase', 'positive', 'optimistic', 'boost',
];

const NEGATIVE_WORDS = [
  'plunge', 'crash', 'drop', 'fall', 'decline', 'loss', 'miss', 'below',
  'downgrade', 'sell', 'bearish', 'weak', 'fail', 'concern', 'risk',
  'warning', 'cut', 'layoff', 'lawsuit', 'investigation', 'scandal',
  'negative', 'pessimistic', 'decrease', 'low',
];

const STRONG_MODIFIERS = ['very', 'extremely', 'significantly', 'sharply', 'dramatically', 'massive'];

export interface NewsItem {
  title: string;
  summary?: string;
  publishedAt: string;
  source?: string;
}

function analyzeSentiment(text: string): number {
  const words = text.toLowerCase().split(/\s+/);
  let score = 0;
  let hasStrongModifier = false;

  for (let i = 0; i < words.length; i++) {
    const word = words[i].replace(/[^a-z]/g, '');

    if (STRONG_MODIFIERS.some(m => word.includes(m))) {
      hasStrongModifier = true;
    }

    if (POSITIVE_WORDS.some(pw => word.includes(pw))) {
      score += hasStrongModifier ? 2 : 1;
      hasStrongModifier = false;
    }
    if (NEGATIVE_WORDS.some(nw => word.includes(nw))) {
      score -= hasStrongModifier ? 2 : 1;
      hasStrongModifier = false;
    }
  }

  return Math.max(-1, Math.min(1, score / 5));
}

export function calculateSentimentSignal(news: NewsItem[]): StrategySignal {
  if (!news || news.length === 0) {
    return {
      name: 'Sentiment',
      score: 0,
      confidence: 0.2,
      reason: 'No news data available',
    };
  }

  const now = Date.now();
  let totalScore = 0;
  let totalWeight = 0;

  news.slice(0, 10).forEach((item, index) => {
    const text = item.title + (item.summary ? ' ' + item.summary : '');
    const sentimentScore = analyzeSentiment(text);

    // recency: exponential decay with 48h half-life
    const ageHours = (now - new Date(item.publishedAt).getTime()) / (1000 * 60 * 60);
    const recencyWeight = Math.exp(-ageHours / 48);
    const positionWeight = Math.exp(-index * 0.15);

    const weight = recencyWeight * positionWeight;
    totalScore += sentimentScore * weight;
    totalWeight += weight;
  });

  const avgScore = totalWeight > 0 ? totalScore / totalWeight : 0;
  const normalizedScore = Math.max(-1, Math.min(1, avgScore));

  let sentimentLabel: string;
  if (normalizedScore > 0.3) sentimentLabel = 'strongly positive';
  else if (normalizedScore > 0.1) sentimentLabel = 'positive';
  else if (normalizedScore < -0.3) sentimentLabel = 'strongly negative';
  else if (normalizedScore < -0.1) sentimentLabel = 'negative';
  else sentimentLabel = 'neutral';

  const confidence = Math.min(0.7, 0.3 + news.length * 0.04);

  return {
    name: 'Sentiment',
    score: normalizedScore,
    confidence,
    reason: `${sentimentLabel.charAt(0).toUpperCase() + sentimentLabel.slice(1)} sentiment from ${news.length} articles`,
  };
}

export function generateMockNews(symbol: string): NewsItem[] {
  const templates = [
    { title: `${symbol} reports strong quarterly earnings`, sentiment: 'positive' },
    { title: `${symbol} announces new product launch`, sentiment: 'positive' },
    { title: `${symbol} faces regulatory concerns`, sentiment: 'negative' },
    { title: `Analysts upgrade ${symbol} stock rating`, sentiment: 'positive' },
    { title: `${symbol} CEO discusses growth strategy`, sentiment: 'neutral' },
  ];

  const count = 3 + Math.floor(Math.random() * 3);
  const shuffled = templates.sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((t, i) => ({
    title: t.title,
    publishedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
  }));
}
