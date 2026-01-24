import { useMemo, useState } from 'react';

interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

interface PerformanceChartProps {
  history: PortfolioSnapshot[];
  initialCapital: number;
}

type TimeRange = '1W' | '1M' | 'YTD' | '1Y' | '5Y' | 'All';

export default function PerformanceChart({ history, initialCapital }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'YTD':
        cutoffDate.setMonth(0, 1); // January 1st of current year
        cutoffDate.setHours(0, 0, 0, 0);
        break;
      case '1Y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case '5Y':
        cutoffDate.setFullYear(now.getFullYear() - 5);
        break;
      case 'All':
        return history;
    }

    return history.filter(h => new Date(h.timestamp) >= cutoffDate);
  }, [history, timeRange]);

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) {
      return null;
    }

    const values = filteredHistory.map(h => h.totalValue);
    const minValue = Math.min(...values, initialCapital) * 0.995;
    const maxValue = Math.max(...values, initialCapital) * 1.005;
    const range = maxValue - minValue;

    const width = 100;
    const height = 100;
    const padding = { top: 10, right: 10, bottom: 10, left: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points = filteredHistory.map((h, i) => {
      const x = padding.left + (i / (filteredHistory.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((h.totalValue - minValue) / range) * chartHeight;
      return { x, y, value: h.totalValue, timestamp: h.timestamp };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    const initialY = padding.top + chartHeight - ((initialCapital - minValue) / range) * chartHeight;

    const currentValue = filteredHistory[filteredHistory.length - 1]?.totalValue || initialCapital;
    const isPositive = currentValue >= initialCapital;

    return {
      points,
      pathD,
      areaD,
      initialY,
      minValue,
      maxValue,
      isPositive,
      currentValue,
      padding,
      chartWidth,
      chartHeight,
    };
  }, [filteredHistory, initialCapital]);

  if (!chartData || filteredHistory.length < 2) {
    return (
      <div className="performance-chart empty">
        <div className="chart-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-6 6" />
          </svg>
          <p>Waiting for data...</p>
          <span>Performance chart will appear after a few runs</span>
        </div>
      </div>
    );
  }

  const { pathD, areaD, initialY, isPositive, currentValue, padding, chartWidth } = chartData;
  const changePercent = ((currentValue - initialCapital) / initialCapital) * 100;

  const timeRanges: TimeRange[] = ['1W', '1M', 'YTD', '1Y', '5Y', 'All'];

  return (
    <div className="performance-chart">
      <div className="chart-header">
        <div className="chart-title">Fund Performance</div>
        <div className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
        </div>
      </div>
      <div className="chart-time-range">
        {timeRanges.map((range) => (
          <button
            key={range}
            className={`time-range-btn ${timeRange === range ? 'active' : ''}`}
            onClick={() => setTimeRange(range)}
          >
            {range}
          </button>
        ))}
      </div>
      <div className="chart-container">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Initial capital reference line */}
          <line
            x1={padding.left}
            y1={initialY}
            x2={padding.left + chartWidth}
            y2={initialY}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeDasharray="2 2"
            strokeWidth="0.5"
          />

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="chart-labels">
        <span className="chart-label-start">
          {new Date(filteredHistory[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className="chart-label-end">
          {new Date(filteredHistory[filteredHistory.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
