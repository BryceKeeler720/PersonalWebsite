import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import type { SignalSnapshot, AssetMetric } from '../trading/types';
import { ASSET_INFO, getAssetType } from '../../lib/trading/assets';
import { getSubCategory } from '../../lib/trading/sectorMap';
import type { FilterState } from './dataTransforms';

interface D3HeatmapProps {
  signals: Record<string, SignalSnapshot>;
  metrics: Record<string, AssetMetric>;
  filters: FilterState;
  onHover: (symbol: string | null, x: number, y: number) => void;
  onClick: (symbol: string) => void;
  highlightSymbol?: string | null;
}

interface TreeNode {
  name: string;
  children?: TreeNode[];
  symbol?: string;
  value?: number;
  signal?: SignalSnapshot;
  metric?: AssetMetric;
}

function signalToColor(combined: number): string {
  const t = (Math.max(-1, Math.min(1, combined)) + 1) / 2;
  let r: number, g: number, b: number;
  if (t < 0.5) {
    // Red (#D92626) -> neutral gray (#737380)
    const s = t * 2;
    r = 0.85 + (0.45 - 0.85) * s;
    g = 0.15 + (0.45 - 0.15) * s;
    b = 0.15 + (0.50 - 0.15) * s;
  } else {
    // Neutral gray (#737380) -> green (#1AB859)
    const s = (t - 0.5) * 2;
    r = 0.45 + (0.10 - 0.45) * s;
    g = 0.45 + (0.72 - 0.45) * s;
    b = 0.50 + (0.35 - 0.50) * s;
  }
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

function formatVolume(v: number): string {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return v.toFixed(0);
}

function buildTreeData(
  signals: Record<string, SignalSnapshot>,
  metrics: Record<string, AssetMetric>,
  filters: FilterState,
): TreeNode {
  const groups = new Map<string, Map<string, TreeNode[]>>();

  for (const [symbol, signal] of Object.entries(signals)) {
    const assetType = getAssetType(symbol);
    if (!filters.assetClasses.includes(assetType)) continue;
    if (signal.combined < filters.minSignal) continue;
    if (filters.signalTypes && filters.signalTypes.length > 0 &&
        !filters.signalTypes.includes(signal.recommendation)) continue;

    const metric = metrics[symbol];
    const subCategory = getSubCategory(symbol);
    const assetLabel = assetType.charAt(0).toUpperCase() + assetType.slice(1);

    if (!groups.has(assetLabel)) groups.set(assetLabel, new Map());
    const subGroups = groups.get(assetLabel)!;
    if (!subGroups.has(subCategory)) subGroups.set(subCategory, []);

    subGroups.get(subCategory)!.push({
      name: symbol,
      symbol,
      value: Math.max(metric?.volume || 1, 1),
      signal,
      metric,
    });
  }

  const children: TreeNode[] = [];
  for (const [assetClass, subGroups] of groups) {
    const subChildren: TreeNode[] = [];
    for (const [subCat, nodes] of subGroups) {
      subChildren.push({ name: subCat, children: nodes });
    }
    children.push({ name: assetClass, children: subChildren });
  }

  return { name: 'Market', children };
}

export default function D3Heatmap({
  signals,
  metrics,
  filters,
  onHover,
  onClick,
  highlightSymbol,
}: D3HeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const svg = d3.select(svgRef.current);

    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const treeData = buildTreeData(signals, metrics, filters);

    const root = d3.hierarchy<TreeNode>(treeData)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap<TreeNode>()
      .size([width, height])
      .padding(1)
      .paddingOuter(2)
      .paddingTop(18)
      .round(true)(root);

    type RectNode = d3.HierarchyRectangularNode<TreeNode>;

    // Draw group labels
    const groups = svg.selectAll<SVGGElement, RectNode>('g.group')
      .data((root.children || []) as RectNode[])
      .enter()
      .append('g')
      .attr('class', 'group');

    groups.append('rect')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', 'none')
      .attr('stroke', 'rgba(220, 215, 186, 0.08)')
      .attr('stroke-width', 1);

    groups.append('text')
      .attr('class', 'heatmap-group-label')
      .attr('x', d => (d.x0 + d.x1) / 2)
      .attr('y', d => d.y0 + 12)
      .text(d => d.data.name);

    // Draw leaf cells
    const leaves = root.leaves() as RectNode[];
    const cells = svg.selectAll<SVGGElement, RectNode>('g.cell')
      .data(leaves)
      .enter()
      .append('g')
      .attr('class', 'cell');

    cells.append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => d.x0)
      .attr('y', d => d.y0)
      .attr('width', d => Math.max(0, d.x1 - d.x0))
      .attr('height', d => Math.max(0, d.y1 - d.y0))
      .attr('fill', d => {
        const signal = d.data.signal;
        return signal ? signalToColor(signal.combined) : '#363646';
      })
      .attr('stroke-width', d => d.data.symbol === highlightSymbol ? 2 : 1)
      .attr('stroke', d => d.data.symbol === highlightSymbol ? '#7E9CD8' : '#1F1F28')
      .attr('rx', 2)
      .on('mousemove', (event, d) => {
        if (d.data.symbol) {
          onHover(d.data.symbol, event.clientX, event.clientY);
        }
      })
      .on('mouseleave', () => onHover(null, 0, 0))
      .on('click', (_event, d) => {
        if (d.data.symbol) onClick(d.data.symbol);
      });

    // Labels for cells large enough
    cells.each(function(d) {
      const cellWidth = d.x1 - d.x0;
      const cellHeight = d.y1 - d.y0;
      if (cellWidth < 30 || cellHeight < 14) return;

      const g = d3.select(this);
      const symbol = d.data.symbol || '';
      // Show short symbol (strip suffixes like -USD, =X, =F)
      const shortSymbol = symbol.replace(/-USD$/, '').replace(/=X$/, '').replace(/=F$/, '');

      g.append('text')
        .attr('class', 'heatmap-label')
        .attr('x', (d.x0 + d.x1) / 2)
        .attr('y', (d.y0 + d.y1) / 2 - (cellHeight > 30 ? 4 : 0))
        .attr('font-size', cellWidth > 60 ? '11px' : '9px')
        .attr('font-weight', '600')
        .text(shortSymbol);

      // Show change% if cell is large enough
      if (cellHeight > 30 && d.data.metric) {
        const change = d.data.metric.changePercent;
        g.append('text')
          .attr('class', 'heatmap-label')
          .attr('x', (d.x0 + d.x1) / 2)
          .attr('y', (d.y0 + d.y1) / 2 + 10)
          .attr('font-size', '9px')
          .attr('fill', change >= 0 ? '#76946A' : '#C34043')
          .text((change >= 0 ? '+' : '') + change.toFixed(2) + '%');
      }

      // Show volume if cell is very large
      if (cellHeight > 46 && cellWidth > 50 && d.data.metric) {
        g.append('text')
          .attr('class', 'heatmap-label')
          .attr('x', (d.x0 + d.x1) / 2)
          .attr('y', (d.y0 + d.y1) / 2 + 22)
          .attr('font-size', '8px')
          .attr('fill', 'rgba(220, 215, 186, 0.5)')
          .text('Vol ' + formatVolume(d.data.metric.volume));
      }
    });
  }, [signals, metrics, filters, highlightSymbol, onHover, onClick]);

  useEffect(() => {
    render();
  }, [render]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(() => render());
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [render]);

  return (
    <div ref={containerRef} className="d3-heatmap">
      <svg ref={svgRef} />
    </div>
  );
}
