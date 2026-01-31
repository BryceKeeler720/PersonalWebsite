import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

interface PortfolioSnapshot {
  timestamp: string;
  totalValue: number;
}

interface BenchmarkPoint {
  timestamp: string;
  value: number;
}

interface D3EquityChartProps {
  history: PortfolioSnapshot[];
  initialCapital: number;
  spyBenchmark?: BenchmarkPoint[];
}

interface ProcessedDataPoint {
  date: Date;
  value: number;
  dailyReturn: number;
  drawdown: number;
  isDrawdown: boolean;
}

interface DrawdownPeriod {
  startDate: Date;
  endDate: Date;
  maxDrawdown: number;
}

type TimeRange = '1D' | '1W' | '1M' | 'YTD' | 'All';

export default function D3EquityChart({ history, initialCapital, spyBenchmark = [] }: D3EquityChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const returnsChartRef = useRef<HTMLDivElement>(null);
  const brushRef = useRef<HTMLDivElement>(null);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [dimensions, setDimensions] = useState({ width: 800, height: 300 });
  const [brushSelection, setBrushSelection] = useState<[Date, Date] | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('All');

  // Store current zoom transform for proper cursor tracking
  const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const brushGroupRef = useRef<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);
  const brushBehaviorRef = useRef<d3.BrushBehavior<unknown> | null>(null);

  // Process data: calculate daily returns and drawdowns
  const processedData = useMemo((): ProcessedDataPoint[] => {
    if (history.length === 0) return [];

    let peak = initialCapital;
    return history.map((snapshot, i) => {
      const date = new Date(snapshot.timestamp);
      const value = snapshot.totalValue;
      const prevValue = i > 0 ? history[i - 1].totalValue : initialCapital;
      const dailyReturn = prevValue > 0 ? ((value - prevValue) / prevValue) * 100 : 0;

      peak = Math.max(peak, value);
      const drawdown = ((value - peak) / peak) * 100;

      return {
        date,
        value,
        dailyReturn,
        drawdown,
        isDrawdown: drawdown < -1,
      };
    });
  }, [history, initialCapital]);

  // Process benchmark data
  const processedBenchmark = useMemo(() => {
    if (spyBenchmark.length === 0) return [];
    return spyBenchmark.map(b => ({
      date: new Date(b.timestamp),
      value: b.value,
    }));
  }, [spyBenchmark]);

  // Filter by time range
  const timeFilteredData = useMemo(() => {
    if (processedData.length === 0) return [];
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '1D': cutoffDate.setDate(now.getDate() - 1); break;
      case '1W': cutoffDate.setDate(now.getDate() - 7); break;
      case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
      case 'YTD': cutoffDate.setMonth(0, 1); cutoffDate.setHours(0, 0, 0, 0); break;
      case 'All': return processedData;
    }
    return processedData.filter(d => d.date >= cutoffDate);
  }, [processedData, timeRange]);

  const timeFilteredBenchmark = useMemo(() => {
    if (processedBenchmark.length === 0) return [];
    const now = new Date();
    const cutoffDate = new Date();

    switch (timeRange) {
      case '1D': cutoffDate.setDate(now.getDate() - 1); break;
      case '1W': cutoffDate.setDate(now.getDate() - 7); break;
      case '1M': cutoffDate.setMonth(now.getMonth() - 1); break;
      case 'YTD': cutoffDate.setMonth(0, 1); cutoffDate.setHours(0, 0, 0, 0); break;
      case 'All': return processedBenchmark;
    }
    return processedBenchmark.filter(d => d.date >= cutoffDate);
  }, [processedBenchmark, timeRange]);

  // Calculate drawdown periods for shading
  const drawdownPeriods = useMemo((): DrawdownPeriod[] => {
    const periods: DrawdownPeriod[] = [];
    let inDrawdown = false;
    let periodStart: Date | null = null;
    let maxDrawdown = 0;

    timeFilteredData.forEach((d, i) => {
      if (d.isDrawdown && !inDrawdown) {
        inDrawdown = true;
        periodStart = d.date;
        maxDrawdown = d.drawdown;
      } else if (d.isDrawdown && inDrawdown) {
        maxDrawdown = Math.min(maxDrawdown, d.drawdown);
      } else if (!d.isDrawdown && inDrawdown) {
        if (periodStart) {
          periods.push({
            startDate: periodStart,
            endDate: timeFilteredData[i - 1]?.date || d.date,
            maxDrawdown,
          });
        }
        inDrawdown = false;
        periodStart = null;
        maxDrawdown = 0;
      }
    });

    if (inDrawdown && periodStart && timeFilteredData.length > 0) {
      periods.push({
        startDate: periodStart,
        endDate: timeFilteredData[timeFilteredData.length - 1].date,
        maxDrawdown,
      });
    }

    return periods;
  }, [timeFilteredData]);

  // Filter data based on brush selection
  const filteredData = useMemo(() => {
    if (!brushSelection) return timeFilteredData;
    return timeFilteredData.filter(d => d.date >= brushSelection[0] && d.date <= brushSelection[1]);
  }, [timeFilteredData, brushSelection]);

  const filteredBenchmark = useMemo(() => {
    if (!brushSelection) return timeFilteredBenchmark;
    return timeFilteredBenchmark.filter(d => d.date >= brushSelection[0] && d.date <= brushSelection[1]);
  }, [timeFilteredBenchmark, brushSelection]);

  const filteredDrawdownPeriods = useMemo(() => {
    if (!brushSelection) return drawdownPeriods;
    return drawdownPeriods.filter(p =>
      p.endDate >= brushSelection[0] && p.startDate <= brushSelection[1]
    ).map(p => ({
      ...p,
      startDate: p.startDate < brushSelection[0] ? brushSelection[0] : p.startDate,
      endDate: p.endDate > brushSelection[1] ? brushSelection[1] : p.endDate,
    }));
  }, [drawdownPeriods, brushSelection]);

  // Reset brush when time range changes
  useEffect(() => {
    setBrushSelection(null);
    currentTransformRef.current = d3.zoomIdentity;
  }, [timeRange]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (mainChartRef.current) {
        const { width } = mainChartRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(300, width), height: 300 });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Main chart rendering
  useEffect(() => {
    if (!mainChartRef.current || filteredData.length < 2) return;

    const margin = { top: 20, right: 60, bottom: 30, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    d3.select(mainChartRef.current).selectAll('*').remove();

    const svg = d3.select(mainChartRef.current)
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    svg.append('defs')
      .append('clipPath')
      .attr('id', 'chart-clip')
      .append('rect')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Base scales
    const xExtent = d3.extent(filteredData, d => d.date) as [Date, Date];
    const xScale = d3.scaleTime()
      .domain(xExtent)
      .range([0, width]);

    const allValues = [
      ...filteredData.map(d => d.value),
      ...(showBenchmark ? filteredBenchmark.map(d => d.value) : []),
    ];
    const yExtent = d3.extent(allValues) as [number, number];
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;
    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([height, 0]);

    // Store base scale for zoom calculations
    const xScaleBase = xScale.copy();

    // Drawdown regions
    const drawdownGroup = g.append('g').attr('clip-path', 'url(#chart-clip)');
    filteredDrawdownPeriods.forEach(period => {
      const x1 = xScale(period.startDate);
      const x2 = xScale(period.endDate);
      drawdownGroup.append('rect')
        .attr('class', 'd3-drawdown-region')
        .attr('x', x1)
        .attr('y', 0)
        .attr('width', Math.max(0, x2 - x1))
        .attr('height', height)
        .attr('fill', 'rgba(195, 64, 67, 0.15)')
        .attr('opacity', 0)
        .transition()
        .duration(800)
        .attr('opacity', 1);
    });

    // Grid lines
    const yTicks = yScale.ticks(5);
    g.selectAll('.grid-line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', 'rgba(220, 215, 186, 0.08)')
      .attr('stroke-dasharray', '2,2');

    // Initial capital reference line
    if (yScale.domain()[0] <= initialCapital && yScale.domain()[1] >= initialCapital) {
      g.append('line')
        .attr('class', 'initial-capital-line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(initialCapital))
        .attr('y2', yScale(initialCapital))
        .attr('stroke', 'rgba(220, 215, 186, 0.3)')
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-width', 1);
    }

    // Area gradient
    const isPositive = filteredData[filteredData.length - 1]?.value >= initialCapital;
    const gradientId = 'area-gradient';
    const gradient = svg.select('defs')
      .append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', isPositive ? '#76946A' : '#C34043')
      .attr('stop-opacity', 0.3);

    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', isPositive ? '#76946A' : '#C34043')
      .attr('stop-opacity', 0);

    // Generators
    const area = d3.area<ProcessedDataPoint>()
      .x(d => xScale(d.date))
      .y0(height)
      .y1(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const line = d3.line<ProcessedDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    const chartGroup = g.append('g').attr('clip-path', 'url(#chart-clip)');

    // Draw area
    const areaPath = chartGroup.append('path')
      .datum(filteredData)
      .attr('class', 'd3-equity-area')
      .attr('fill', `url(#${gradientId})`)
      .attr('d', area);

    // Draw portfolio line with animation
    const linePath = chartGroup.append('path')
      .datum(filteredData)
      .attr('class', 'd3-equity-line')
      .attr('fill', 'none')
      .attr('stroke', isPositive ? '#76946A' : '#C34043')
      .attr('stroke-width', 2)
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .attr('d', line);

    const totalLength = linePath.node()?.getTotalLength() || 0;
    linePath
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(1500)
      .ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0)
      .on('end', function() {
        d3.select(this).attr('stroke-dasharray', null);
      });

    // Benchmark line
    if (showBenchmark && filteredBenchmark.length > 1) {
      const benchmarkLine = d3.line<{ date: Date; value: number }>()
        .x(d => xScale(d.date))
        .y(d => yScale(d.value))
        .curve(d3.curveMonotoneX);

      const benchmarkPath = chartGroup.append('path')
        .datum(filteredBenchmark)
        .attr('class', 'd3-benchmark-line')
        .attr('fill', 'none')
        .attr('stroke', '#C0A36E')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', '5,3')
        .attr('opacity', 0.8)
        .attr('d', benchmarkLine);

      const benchmarkLength = benchmarkPath.node()?.getTotalLength() || 0;
      benchmarkPath
        .attr('stroke-dasharray', `${benchmarkLength} ${benchmarkLength}`)
        .attr('stroke-dashoffset', benchmarkLength)
        .transition()
        .duration(1500)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0)
        .on('end', function() {
          d3.select(this).attr('stroke-dasharray', '5,3');
        });
    }

    // Axes
    const xAxisGroup = g.append('g')
      .attr('class', 'd3-x-axis')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(d => d3.timeFormat('%b %d')(d as Date)));

    xAxisGroup.selectAll('text')
      .attr('fill', 'rgba(220, 215, 186, 0.5)')
      .attr('font-size', '10px');

    g.append('g')
      .attr('class', 'd3-y-axis')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => `$${d3.format(',.0f')(d as number)}`))
      .selectAll('text')
      .attr('fill', 'rgba(220, 215, 186, 0.5)')
      .attr('font-size', '10px');

    g.selectAll('.d3-x-axis path, .d3-x-axis line, .d3-y-axis path, .d3-y-axis line')
      .attr('stroke', 'rgba(220, 215, 186, 0.1)');

    // Tooltip elements
    const tooltip = d3.select(mainChartRef.current)
      .append('div')
      .attr('class', 'd3-chart-tooltip')
      .style('opacity', 0);

    const verticalLine = g.append('line')
      .attr('class', 'd3-vertical-line')
      .attr('stroke', 'rgba(220, 215, 186, 0.4)')
      .attr('stroke-width', 1)
      .style('opacity', 0);

    const hoverCircle = g.append('circle')
      .attr('class', 'd3-hover-circle')
      .attr('r', 5)
      .attr('fill', isPositive ? '#76946A' : '#C34043')
      .attr('stroke', '#DCD7BA')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    const bisect = d3.bisector<ProcessedDataPoint, Date>(d => d.date).left;

    // Overlay for mouse events
    const overlay = g.append('rect')
      .attr('class', 'd3-overlay')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', 'transparent')
      .style('cursor', 'crosshair');

    // Mouse move handler that uses current transform
    const handleMouseMove = (event: MouseEvent) => {
      const [mouseX] = d3.pointer(event);

      // Apply current zoom transform to get the correct scale
      const currentXScale = currentTransformRef.current.rescaleX(xScaleBase);
      const x0 = currentXScale.invert(mouseX);
      const i = bisect(filteredData, x0, 1);
      const d0 = filteredData[i - 1];
      const d1 = filteredData[i];

      if (!d0 && !d1) return;

      const d = !d1 ? d0 : !d0 ? d1 :
        x0.getTime() - d0.date.getTime() > d1.date.getTime() - x0.getTime() ? d1 : d0;

      // Use transformed scale for positioning
      const xPos = currentXScale(d.date);
      const yPos = yScale(d.value);

      verticalLine
        .attr('x1', xPos)
        .attr('x2', xPos)
        .attr('y1', 0)
        .attr('y2', height)
        .style('opacity', 1);

      hoverCircle
        .attr('cx', xPos)
        .attr('cy', yPos)
        .attr('fill', d.value >= initialCapital ? '#76946A' : '#C34043')
        .style('opacity', 1);

      const changeFromStart = d.value - initialCapital;
      const changePercent = (changeFromStart / initialCapital) * 100;

      // Position tooltip to avoid covering the dot
      // Left half of chart: tooltip on the right side of the dot
      // Right half of chart: tooltip on the left side of the dot
      const tooltipWidth = 180;
      const dotPadding = 20; // Same padding on both sides
      const tooltipX = xPos > width / 2
        ? xPos + margin.left - tooltipWidth - dotPadding
        : xPos + margin.left + dotPadding;

      // Keep vertical centered on the dot
      const tooltipY = Math.max(10, Math.min(height - 80, yPos + margin.top - 50));

      tooltip
        .style('opacity', 1)
        .style('left', `${tooltipX}px`)
        .style('top', `${tooltipY}px`)
        .html(`
          <div class="d3-tooltip-value">$${d3.format(',.2f')(d.value)}</div>
          <div class="d3-tooltip-date">${d3.timeFormat('%b %d, %Y %H:%M')(d.date)}</div>
          <div class="d3-tooltip-change ${changeFromStart >= 0 ? 'positive' : 'negative'}">
            ${changeFromStart >= 0 ? '+' : ''}$${d3.format(',.2f')(changeFromStart)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)
          </div>
          <div class="d3-tooltip-daily">Daily: ${d.dailyReturn >= 0 ? '+' : ''}${d.dailyReturn.toFixed(2)}%</div>
          ${d.drawdown < -1 ? `<div class="d3-tooltip-drawdown">Drawdown: ${d.drawdown.toFixed(2)}%</div>` : ''}
        `);
    };

    overlay
      .on('mousemove', handleMouseMove as any)
      .on('mouseout', () => {
        tooltip.style('opacity', 0);
        verticalLine.style('opacity', 0);
        hoverCircle.style('opacity', 0);
      });

    // Zoom behavior
    const zoom = d3.zoom<SVGRectElement, unknown>()
      .scaleExtent([1, 10])
      .translateExtent([[0, 0], [width, height]])
      .extent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        // Store the current transform
        currentTransformRef.current = event.transform;
        const newXScale = event.transform.rescaleX(xScaleBase);

        // Update line and area with new scale
        linePath
          .interrupt()
          .attr('stroke-dasharray', null)
          .attr('stroke-dashoffset', null)
          .attr('d', d3.line<ProcessedDataPoint>()
            .x(d => newXScale(d.date))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX)(filteredData));

        areaPath.attr('d', d3.area<ProcessedDataPoint>()
          .x(d => newXScale(d.date))
          .y0(height)
          .y1(d => yScale(d.value))
          .curve(d3.curveMonotoneX)(filteredData));

        // Update benchmark
        if (showBenchmark && filteredBenchmark.length > 1) {
          chartGroup.select('.d3-benchmark-line')
            .attr('d', d3.line<{ date: Date; value: number }>()
              .x(d => newXScale(d.date))
              .y(d => yScale(d.value))
              .curve(d3.curveMonotoneX)(filteredBenchmark));
        }

        // Update drawdown regions
        drawdownGroup.selectAll('.d3-drawdown-region')
          .attr('x', (_, i) => newXScale(filteredDrawdownPeriods[i].startDate))
          .attr('width', (_, i) => Math.max(0,
            newXScale(filteredDrawdownPeriods[i].endDate) - newXScale(filteredDrawdownPeriods[i].startDate)
          ));

        // Update x-axis
        xAxisGroup.call(d3.axisBottom(newXScale).ticks(6).tickFormat(d => d3.timeFormat('%b %d')(d as Date)) as any);
        xAxisGroup.selectAll('text')
          .attr('fill', 'rgba(220, 215, 186, 0.5)')
          .attr('font-size', '10px');
        xAxisGroup.selectAll('path, line')
          .attr('stroke', 'rgba(220, 215, 186, 0.1)');
      });

    overlay.call(zoom);

    // Reset zoom transform ref when data changes
    currentTransformRef.current = d3.zoomIdentity;

  }, [filteredData, filteredBenchmark, filteredDrawdownPeriods, dimensions, showBenchmark, initialCapital]);

  // Daily returns bar chart
  useEffect(() => {
    if (!returnsChartRef.current || filteredData.length < 2) return;

    const margin = { top: 10, right: 60, bottom: 30, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = 120 - margin.top - margin.bottom;

    d3.select(returnsChartRef.current).selectAll('*').remove();

    const svg = d3.select(returnsChartRef.current)
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', 120)
      .attr('viewBox', `0 0 ${dimensions.width} 120`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xExtent = d3.extent(filteredData, d => d.date) as [Date, Date];
    const xScale = d3.scaleBand<Date>()
      .domain(filteredData.map(d => d.date))
      .range([0, width])
      .padding(0.2);

    const maxReturn = Math.max(Math.abs(d3.min(filteredData, d => d.dailyReturn) || 0),
                               Math.abs(d3.max(filteredData, d => d.dailyReturn) || 0));
    const yScale = d3.scaleLinear()
      .domain([-maxReturn * 1.1, maxReturn * 1.1])
      .range([height, 0]);

    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', 'rgba(220, 215, 186, 0.3)')
      .attr('stroke-width', 1);

    g.selectAll('.return-bar')
      .data(filteredData)
      .enter()
      .append('rect')
      .attr('class', 'return-bar')
      .attr('x', d => xScale(d.date) || 0)
      .attr('width', Math.max(1, xScale.bandwidth()))
      .attr('y', yScale(0))
      .attr('height', 0)
      .attr('fill', d => d.dailyReturn >= 0 ? '#76946A' : '#C34043')
      .attr('opacity', 0.7)
      .transition()
      .duration(800)
      .delay((_, i) => i * 5)
      .attr('y', d => d.dailyReturn >= 0 ? yScale(d.dailyReturn) : yScale(0))
      .attr('height', d => Math.abs(yScale(d.dailyReturn) - yScale(0)));

    const xAxisTime = d3.scaleTime()
      .domain(xExtent)
      .range([0, width]);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xAxisTime).ticks(6).tickFormat(d => d3.timeFormat('%b %d')(d as Date)))
      .selectAll('text')
      .attr('fill', 'rgba(220, 215, 186, 0.5)')
      .attr('font-size', '9px');

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(3).tickFormat(d => `${d}%`))
      .selectAll('text')
      .attr('fill', 'rgba(220, 215, 186, 0.5)')
      .attr('font-size', '9px');

    g.selectAll('path, line').attr('stroke', 'rgba(220, 215, 186, 0.1)');

  }, [filteredData, dimensions]);

  // Brush for date range selection
  useEffect(() => {
    if (!brushRef.current || timeFilteredData.length < 2) return;

    const margin = { top: 5, right: 60, bottom: 20, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = 50 - margin.top - margin.bottom;

    d3.select(brushRef.current).selectAll('*').remove();

    const svg = d3.select(brushRef.current)
      .append('svg')
      .attr('width', dimensions.width)
      .attr('height', 50)
      .attr('viewBox', `0 0 ${dimensions.width} 50`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(timeFilteredData, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(timeFilteredData, d => d.value) as [number, number])
      .range([height, 0]);

    const line = d3.line<ProcessedDataPoint>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append('path')
      .datum(timeFilteredData)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(220, 215, 186, 0.4)')
      .attr('stroke-width', 1)
      .attr('d', line);

    const brush = d3.brushX<unknown>()
      .extent([[0, 0], [width, height]])
      .on('brush end', (event) => {
        if (!event.selection) {
          setBrushSelection(null);
          return;
        }
        const [x0, x1] = event.selection as [number, number];
        setBrushSelection([xScale.invert(x0), xScale.invert(x1)]);
      });

    const brushGroup = g.append('g')
      .attr('class', 'd3-brush')
      .call(brush);

    brushBehaviorRef.current = brush;
    brushGroupRef.current = brushGroup;

    brushGroup.selectAll('.selection')
      .attr('fill', 'rgba(126, 156, 216, 0.3)')
      .attr('stroke', 'rgba(126, 156, 216, 0.6)');

    brushGroup.selectAll('.handle')
      .attr('fill', 'rgba(220, 215, 186, 0.8)');

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(4).tickFormat(d => d3.timeFormat('%b')(d as Date)))
      .selectAll('text')
      .attr('fill', 'rgba(220, 215, 186, 0.4)')
      .attr('font-size', '8px');

    g.selectAll('path, line').attr('stroke', 'rgba(220, 215, 186, 0.1)');

  }, [timeFilteredData, dimensions]);

  // Clear brush visual when selection is reset
  useEffect(() => {
    if (!brushSelection && brushGroupRef.current && brushBehaviorRef.current) {
      brushBehaviorRef.current.move(brushGroupRef.current, null);
    }
  }, [brushSelection]);

  // Calculate stats
  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const currentValue = filteredData[filteredData.length - 1]?.value || initialCapital;
    const change = currentValue - initialCapital;
    const changePercent = (change / initialCapital) * 100;

    const benchmarkStart = filteredBenchmark[0]?.value || initialCapital;
    const benchmarkEnd = filteredBenchmark[filteredBenchmark.length - 1]?.value || benchmarkStart;
    const benchmarkChange = ((benchmarkEnd - benchmarkStart) / benchmarkStart) * 100;

    return {
      currentValue,
      change,
      changePercent,
      isPositive: change >= 0,
      benchmarkChange,
      hasBenchmark: filteredBenchmark.length > 1,
    };
  }, [filteredData, filteredBenchmark, initialCapital]);

  if (processedData.length < 2) {
    return (
      <div className="d3-equity-chart empty">
        <div className="chart-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18" />
            <path d="M18 9l-5 5-4-4-6 6" />
          </svg>
          <p>Waiting for data...</p>
          <span>Equity chart will appear after more data points</span>
        </div>
      </div>
    );
  }

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', 'YTD', 'All'];

  return (
    <div className="d3-equity-chart">
      <div className="d3-chart-header">
        <div className="d3-chart-title">
          <span>Equity Curve</span>
          <span className="d3-chart-legend">
            <span className={`legend-item ${stats?.isPositive ? 'positive' : 'negative'}`}>● Portfolio</span>
            {stats?.hasBenchmark && showBenchmark && (
              <span className="legend-item benchmark">● S&P 500</span>
            )}
          </span>
        </div>
        <div className="d3-chart-controls">
          <div className="d3-chart-value-display">
            <span className="d3-current-value">
              ${stats?.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`d3-change ${stats?.isPositive ? 'positive' : 'negative'}`}>
              {stats?.isPositive ? '+' : ''}{stats?.changePercent.toFixed(2)}%
            </span>
            {stats?.hasBenchmark && showBenchmark && (
              <span className="d3-benchmark-change">
                (S&P: {stats?.benchmarkChange >= 0 ? '+' : ''}{stats?.benchmarkChange.toFixed(2)}%)
              </span>
            )}
          </div>
          <button
            className={`benchmark-toggle ${showBenchmark ? 'active' : ''}`}
            onClick={() => setShowBenchmark(!showBenchmark)}
          >
            {showBenchmark ? 'Hide' : 'Show'} S&P 500
          </button>
        </div>
      </div>

      {/* Time range tabs */}
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

      {/* Main equity chart */}
      <div ref={mainChartRef} className="d3-main-chart" />

      {/* Daily returns bar chart */}
      <div className="d3-returns-section">
        <div className="d3-returns-title">Daily Returns</div>
        <div ref={returnsChartRef} className="d3-returns-chart" />
      </div>

      {/* Brush for date selection */}
      <div className="d3-brush-section">
        <div className="d3-brush-title">
          Date Range
          {brushSelection && (
            <button className="d3-reset-brush" onClick={() => setBrushSelection(null)}>
              Reset
            </button>
          )}
        </div>
        <div ref={brushRef} className="d3-brush-chart" />
      </div>
    </div>
  );
}
