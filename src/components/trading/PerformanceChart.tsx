import { useMemo, useState, useRef } from 'react';

interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

interface BenchmarkPoint {
  timestamp: string;
  value: number;
}

interface PerformanceChartProps {
  history: PortfolioSnapshot[];
  initialCapital: number;
  spyBenchmark?: BenchmarkPoint[];
}

type TimeRange = '1D' | '1W' | '1M' | 'YTD' | 'All';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  timestamp: string;
  index: number;
}

export default function PerformanceChart({ history, initialCapital, spyBenchmark = [] }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('All');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '1D': cutoffDate.setDate(now.getDate() - 1); break;
      case '1W': cutoffDate.setDate(now.getDate() - 7); break;
      case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
      case 'YTD': cutoffDate.setMonth(0, 1); cutoffDate.setHours(0, 0, 0, 0); break;
      case 'All': return history;
    }
    return history.filter(h => new Date(h.timestamp) >= cutoffDate);
  }, [history, timeRange]);

  const filteredBenchmark = useMemo(() => {
    if (spyBenchmark.length === 0) return [];
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '1D': cutoffDate.setDate(now.getDate() - 1); break;
      case '1W': cutoffDate.setDate(now.getDate() - 7); break;
      case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
      case 'YTD': cutoffDate.setMonth(0, 1); cutoffDate.setHours(0, 0, 0, 0); break;
      case 'All': return spyBenchmark;
    }
    return spyBenchmark.filter(h => new Date(h.timestamp) >= cutoffDate);
  }, [spyBenchmark, timeRange]);

  const chartData = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const portfolioValues = filteredHistory.map(h => h.totalValue);
    const benchmarkValues = filteredBenchmark.map(b => b.value);
    const allValues = [...portfolioValues, ...benchmarkValues];

    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const dataRange = dataMax - dataMin;

    let tickIncrement: number;
    if (dataRange < 50) tickIncrement = 10;
    else if (dataRange < 200) tickIncrement = 50;
    else if (dataRange < 1000) tickIncrement = 100;
    else if (dataRange < 5000) tickIncrement = 500;
    else tickIncrement = 1000;

    const padding_amount = Math.max(tickIncrement, dataRange * 0.1);
    const minValue = Math.floor((dataMin - padding_amount) / tickIncrement) * tickIncrement;
    const maxValue = Math.ceil((dataMax + padding_amount) / tickIncrement) * tickIncrement;
    const range = maxValue - minValue;

    const width = 800;
    const height = 200;
    const padding = { top: 15, right: 35, bottom: 25, left: 55 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points: ChartPoint[] = filteredHistory.map((h, i) => {
      const x = padding.left + (i / (filteredHistory.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((h.totalValue - minValue) / range) * chartHeight;
      return { x, y, value: h.totalValue, timestamp: h.timestamp, index: i };
    });

    const benchmarkPoints: ChartPoint[] = filteredBenchmark.map((b, i) => {
      const x = padding.left + (i / (filteredBenchmark.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((b.value - minValue) / range) * chartHeight;
      return { x, y, value: b.value, timestamp: b.timestamp, index: i };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const benchmarkPathD = benchmarkPoints.length > 1
      ? benchmarkPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
      : '';
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    const currentValue = filteredHistory[filteredHistory.length - 1]?.totalValue || initialCapital;
    const isPositive = currentValue >= initialCapital;

    const yLabels = [];
    for (let val = minValue; val <= maxValue; val += tickIncrement) {
      const y = padding.top + chartHeight - ((val - minValue) / range) * chartHeight;
      yLabels.push({ value: val, y });
    }

    const xLabels = [];
    const numXLabels = 5;
    for (let i = 0; i < numXLabels; i++) {
      const idx = Math.floor((i / (numXLabels - 1)) * (filteredHistory.length - 1));
      if (filteredHistory[idx]) {
        const x = padding.left + (idx / (filteredHistory.length - 1 || 1)) * chartWidth;
        xLabels.push({ timestamp: filteredHistory[idx].timestamp, x });
      }
    }

    const spyCurrentValue = filteredBenchmark[filteredBenchmark.length - 1]?.value || initialCapital;
    const spyChangePercent = ((spyCurrentValue - initialCapital) / initialCapital) * 100;

    return {
      points, benchmarkPoints, pathD, benchmarkPathD, areaD, minValue, maxValue, isPositive, currentValue,
      padding, chartWidth, chartHeight, width, height, yLabels, xLabels, spyChangePercent,
    };
  }, [filteredHistory, filteredBenchmark, initialCapital]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !chartData) return;
    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const { padding, chartWidth, points, width } = chartData;
    const chartStartX = (padding.left / width) * rect.width;
    const chartEndX = ((padding.left + chartWidth) / width) * rect.width;

    if (mouseX < chartStartX || mouseX > chartEndX) {
      setHoveredIndex(null);
      return;
    }

    const percentX = (mouseX - chartStartX) / (chartEndX - chartStartX);
    const index = Math.round(percentX * (points.length - 1));
    setHoveredIndex(Math.max(0, Math.min(points.length - 1, index)));
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

  const formatCurrencyPrecise = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatTooltipTime = (timestamp: string) =>
    new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

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

  const { pathD, benchmarkPathD, areaD, isPositive, currentValue, padding, chartWidth, chartHeight, width, height, yLabels, xLabels, points, spyChangePercent } = chartData;
  const changePercent = ((currentValue - initialCapital) / initialCapital) * 100;
  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;
  const timeRanges: TimeRange[] = ['1D', '1W', '1M', 'YTD', 'All'];

  return (
    <div className="performance-chart">
      <div className="chart-header">
        <div className="chart-title">
          <span style={{ marginRight: '1rem' }}>Fund Performance</span>
          {benchmarkPathD && (
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
              <span style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>● Portfolio</span>
              <span style={{ marginLeft: '0.75rem', color: '#f59e0b' }}>● S&P 500</span>
            </span>
          )}
        </div>
        <div className="chart-value-display">
          <span className="chart-current-value">{formatCurrencyPrecise(currentValue)}</span>
          <span className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
          {benchmarkPathD && (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', marginLeft: '0.5rem' }}>
              (SPY: {spyChangePercent >= 0 ? '+' : ''}{spyChangePercent.toFixed(2)}%)
            </span>
          )}
        </div>
      </div>
      <div className="chart-time-range">
        {timeRanges.map((range) => (
          <button key={range} className={`time-range-btn ${timeRange === range ? 'active' : ''}`} onClick={() => setTimeRange(range)}>
            {range}
          </button>
        ))}
      </div>
      <div className="chart-container" ref={chartRef} onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIndex(null)}>
        <svg viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yLabels.map((label, i) => (
            <g key={i}>
              <line x1={padding.left} y1={label.y} x2={padding.left + chartWidth} y2={label.y}
                stroke={label.value === initialCapital ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}
                strokeWidth="1" strokeDasharray={label.value === initialCapital ? '4 4' : undefined} />
              <text x={padding.left - 8} y={label.y} fill="rgba(255, 255, 255, 0.5)" fontSize="9" textAnchor="end" dominantBaseline="middle">
                {formatCurrency(label.value)}
              </text>
            </g>
          ))}

          {xLabels.map((label, i) => (
            <text key={i} x={label.x} y={height - 6} fill="rgba(255, 255, 255, 0.5)" fontSize="9" textAnchor="middle">
              {formatTime(label.timestamp)}
            </text>
          ))}

          <path d={areaD} fill="url(#chartGradient)" />

          {benchmarkPathD && (
            <path d={benchmarkPathD} fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
          )}

          <path d={pathD} fill="none" stroke={isPositive ? '#22c55e' : '#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {hoveredPoint && (
            <>
              <line x1={hoveredPoint.x} y1={padding.top} x2={hoveredPoint.x} y2={padding.top + chartHeight} stroke="rgba(255, 255, 255, 0.4)" strokeWidth="1" />
              <line x1={padding.left} y1={hoveredPoint.y} x2={hoveredPoint.x} y2={hoveredPoint.y} stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx={hoveredPoint.x} cy={hoveredPoint.y} r="4" fill={hoveredPoint.value >= initialCapital ? '#22c55e' : '#ef4444'} stroke="white" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {hoveredPoint && chartRef.current && (
          <div className="chart-tooltip" style={{ left: `${(hoveredPoint.x / width) * 100}%`, top: '10px', transform: hoveredPoint.x > width / 2 ? 'translateX(-110%)' : 'translateX(10%)' }}>
            <div className="tooltip-value">{formatCurrencyPrecise(hoveredPoint.value)}</div>
            <div className="tooltip-time">{formatTooltipTime(hoveredPoint.timestamp)}</div>
            <div className={`tooltip-change ${hoveredPoint.value >= initialCapital ? 'positive' : 'negative'}`}>
              {hoveredPoint.value >= initialCapital ? '+' : ''}
              {formatCurrencyPrecise(hoveredPoint.value - initialCapital)} ({((hoveredPoint.value - initialCapital) / initialCapital * 100).toFixed(2)}%)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
