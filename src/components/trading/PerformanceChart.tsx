import { useMemo, useState, useRef } from 'react';

interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

interface PerformanceChartProps {
  history: PortfolioSnapshot[];
  initialCapital: number;
}

type TimeRange = '1D' | '1W' | '1M' | 'YTD' | 'All';

interface ChartPoint {
  x: number;
  y: number;
  value: number;
  timestamp: string;
}

export default function PerformanceChart({ history, initialCapital }: PerformanceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('All');
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const filteredHistory = useMemo(() => {
    if (history.length === 0) return [];

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '1D':
        cutoffDate.setDate(now.getDate() - 1);
        break;
      case '1W':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '1M':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'YTD':
        cutoffDate.setMonth(0, 1);
        cutoffDate.setHours(0, 0, 0, 0);
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
    const minValue = Math.min(...values, initialCapital) * 0.998;
    const maxValue = Math.max(...values, initialCapital) * 1.002;
    const range = maxValue - minValue;

    // SVG viewBox dimensions
    const width = 400;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const points: ChartPoint[] = filteredHistory.map((h, i) => {
      const x = padding.left + (i / (filteredHistory.length - 1 || 1)) * chartWidth;
      const y = padding.top + chartHeight - ((h.totalValue - minValue) / range) * chartHeight;
      return { x, y, value: h.totalValue, timestamp: h.timestamp };
    });

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;

    const initialY = padding.top + chartHeight - ((initialCapital - minValue) / range) * chartHeight;

    const currentValue = filteredHistory[filteredHistory.length - 1]?.totalValue || initialCapital;
    const isPositive = currentValue >= initialCapital;

    // Generate Y-axis labels (5 labels)
    const yLabels = [];
    const yStep = range / 4;
    for (let i = 0; i <= 4; i++) {
      const value = minValue + (yStep * i);
      const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
      yLabels.push({ value, y });
    }

    // Generate X-axis labels (show start, middle, end times)
    const xLabels = [];
    const indices = [0, Math.floor(filteredHistory.length / 2), filteredHistory.length - 1];
    for (const idx of indices) {
      if (filteredHistory[idx]) {
        const x = padding.left + (idx / (filteredHistory.length - 1 || 1)) * chartWidth;
        xLabels.push({ timestamp: filteredHistory[idx].timestamp, x });
      }
    }

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
      width,
      height,
      yLabels,
      xLabels,
    };
  }, [filteredHistory, initialCapital]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!chartRef.current || !chartData) return;

    const rect = chartRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert mouse position to SVG coordinates
    const svgX = (mouseX / rect.width) * chartData.width;

    // Find the closest point
    let closestPoint: ChartPoint | null = null;
    let closestDistance = Infinity;

    for (const point of chartData.points) {
      const distance = Math.abs(point.x - svgX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
      }
    }

    if (closestPoint && closestDistance < 30) {
      setHoveredPoint(closestPoint);
      setMousePosition({ x: mouseX, y: mouseY });
    } else {
      setHoveredPoint(null);
      setMousePosition(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setMousePosition(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyPrecise = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatTooltipTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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

  const { pathD, areaD, initialY, isPositive, currentValue, padding, chartWidth, chartHeight, width, height, yLabels, xLabels, points } = chartData;
  const changePercent = ((currentValue - initialCapital) / initialCapital) * 100;

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', 'YTD', 'All'];

  return (
    <div className="performance-chart">
      <div className="chart-header">
        <div className="chart-title">Fund Performance</div>
        <div className="chart-value-display">
          <span className="chart-current-value">{formatCurrencyPrecise(currentValue)}</span>
          <span className={`chart-change ${isPositive ? 'positive' : 'negative'}`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
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
      <div
        className="chart-container"
        ref={chartRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={isPositive ? '#22c55e' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines and labels */}
          {yLabels.map((label, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={label.y}
                x2={padding.left + chartWidth}
                y2={label.y}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={label.y}
                fill="rgba(255, 255, 255, 0.5)"
                fontSize="10"
                textAnchor="end"
                dominantBaseline="middle"
              >
                {formatCurrency(label.value)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <text
              key={i}
              x={label.x}
              y={height - 8}
              fill="rgba(255, 255, 255, 0.5)"
              fontSize="10"
              textAnchor="middle"
            >
              {formatTime(label.timestamp)}
            </text>
          ))}

          {/* Initial capital reference line */}
          <line
            x1={padding.left}
            y1={initialY}
            x2={padding.left + chartWidth}
            y2={initialY}
            stroke="rgba(255, 255, 255, 0.3)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <text
            x={padding.left + chartWidth + 4}
            y={initialY}
            fill="rgba(255, 255, 255, 0.4)"
            fontSize="9"
            dominantBaseline="middle"
          >
            Start
          </text>

          {/* Area fill */}
          <path d={areaD} fill="url(#chartGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke={isPositive ? '#22c55e' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover indicator */}
          {hoveredPoint && (
            <>
              {/* Vertical line */}
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + chartHeight}
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
              {/* Point circle */}
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="6"
                fill={isPositive ? '#22c55e' : '#ef4444'}
                stroke="white"
                strokeWidth="2"
              />
            </>
          )}
        </svg>

        {/* Tooltip */}
        {hoveredPoint && mousePosition && (
          <div
            className="chart-tooltip"
            style={{
              left: mousePosition.x < (chartRef.current?.clientWidth || 0) / 2
                ? mousePosition.x + 15
                : mousePosition.x - 130,
              top: mousePosition.y - 60,
            }}
          >
            <div className="tooltip-value">{formatCurrencyPrecise(hoveredPoint.value)}</div>
            <div className="tooltip-time">{formatTooltipTime(hoveredPoint.timestamp)}</div>
            <div className={`tooltip-change ${hoveredPoint.value >= initialCapital ? 'positive' : 'negative'}`}>
              {hoveredPoint.value >= initialCapital ? '+' : ''}
              {((hoveredPoint.value - initialCapital) / initialCapital * 100).toFixed(2)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
