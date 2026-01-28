import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { JournalEntryData } from './JournalHeatmap';

interface JournalKnowledgeMapProps {
  entries: JournalEntryData[];
}

const TAG_COLORS = [
  '#76946A', '#7E9CD8', '#C0A36E', '#957FB8', '#C34043',
  '#6A9589', '#FFA066', '#D27E99', '#7FB4CA', '#938AA9',
  '#727169', '#DCA561',
];

interface Node {
  entry: JournalEntryData;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

interface Edge {
  source: number;
  target: number;
  sharedTags: string[];
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function sharedTagCount(a: JournalEntryData, b: JournalEntryData): string[] {
  return a.tags.filter(t => b.tags.includes(t));
}

function runForceSimulation(nodes: Node[], edges: Edge[], width: number, height: number): void {
  const cx = width / 2;
  const cy = height / 2;
  const iterations = 300;

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const strength = alpha * 0.3;

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = nodes[j].x - nodes[i].x;
        let dy = nodes[j].y - nodes[i].y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = (nodes[i].radius + nodes[j].radius) * 3;
        const repulse = (minDist * minDist) / (dist * dist) * strength * 2;
        const fx = (dx / dist) * repulse;
        const fy = (dy / dist) * repulse;
        nodes[i].vx -= fx;
        nodes[i].vy -= fy;
        nodes[j].vx += fx;
        nodes[j].vy += fy;
      }
    }

    // Attraction along edges (shared tags)
    for (const edge of edges) {
      const a = nodes[edge.source];
      const b = nodes[edge.target];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const attract = (dist - 60) * strength * 0.05 * edge.sharedTags.length;
      const fx = (dx / dist) * attract;
      const fy = (dy / dist) * attract;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Center gravity
    for (const node of nodes) {
      node.vx += (cx - node.x) * strength * 0.01;
      node.vy += (cy - node.y) * strength * 0.01;
    }

    // Apply velocities with damping
    for (const node of nodes) {
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;
      // Keep within bounds with padding
      node.x = Math.max(40, Math.min(width - 40, node.x));
      node.y = Math.max(40, Math.min(height - 40, node.y));
    }
  }
}

export default function JournalKnowledgeMap({ entries }: JournalKnowledgeMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 420 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Attach wheel listener with { passive: false } so preventDefault works
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const scaleFactor = e.deltaY < 0 ? 1.1 : 0.9;
      setTransform(t => {
        const newK = Math.max(0.3, Math.min(5, t.k * scaleFactor));
        const ratio = newK / t.k;
        return { k: newK, x: mouseX - (mouseX - t.x) * ratio, y: mouseY - (mouseY - t.y) * ratio };
      });
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((es) => {
      const { width } = es[0].contentRect;
      setDimensions({ width: Math.max(width, 300), height: 420 });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tagColorMap = useMemo(() => {
    const allTags = [...new Set(entries.flatMap(e => e.tags))];
    const map = new Map<string, string>();
    allTags.forEach((tag, i) => map.set(tag, TAG_COLORS[i % TAG_COLORS.length]));
    return map;
  }, [entries]);

  const { nodes, edges } = useMemo(() => {
    if (entries.length === 0) return { nodes: [] as Node[], edges: [] as Edge[] };

    const w = dimensions.width;
    const h = dimensions.height;
    const maxWords = Math.max(...entries.map(e => e.wordCount), 1);

    // Group entries by primary tag for initial positioning
    const allTags = [...new Set(entries.flatMap(e => e.tags))];
    const tagAngles = new Map<string, number>();
    allTags.forEach((tag, i) => {
      tagAngles.set(tag, (i / allTags.length) * Math.PI * 2);
    });

    // Initialize nodes in tag-based clusters
    const spreadRadius = Math.min(w, h) * 0.3;
    const nodeList: Node[] = entries.map((entry, idx) => {
      const primaryTag = entry.tags[0] || 'untagged';
      const angle = tagAngles.get(primaryTag) ?? 0;
      const jitterX = (seededRandom(idx * 13 + 5) - 0.5) * 80;
      const jitterY = (seededRandom(idx * 29 + 11) - 0.5) * 80;
      const radius = Math.max(3, Math.min(7, Math.log(entry.wordCount + 1) * 1.2));

      return {
        entry,
        x: w / 2 + Math.cos(angle) * spreadRadius + jitterX,
        y: h / 2 + Math.sin(angle) * spreadRadius + jitterY,
        vx: 0,
        vy: 0,
        radius,
        color: tagColorMap.get(primaryTag) || '#64748b',
      };
    });

    // Build edges from shared tags
    const edgeList: Edge[] = [];
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const shared = sharedTagCount(entries[i], entries[j]);
        if (shared.length > 0) {
          edgeList.push({ source: i, target: j, sharedTags: shared });
        }
      }
    }

    // Run force simulation
    runForceSimulation(nodeList, edgeList, w, h);

    return { nodes: nodeList, edges: edgeList };
  }, [entries, dimensions, tagColorMap]);

  // Compute tag cluster labels
  const clusterLabels = useMemo(() => {
    if (nodes.length === 0) return [];
    const tagPositions = new Map<string, { sumX: number; sumY: number; count: number; color: string }>();

    nodes.forEach(node => {
      const primaryTag = node.entry.tags[0];
      if (!primaryTag) return;
      const existing = tagPositions.get(primaryTag) || { sumX: 0, sumY: 0, count: 0, color: tagColorMap.get(primaryTag) || '#64748b' };
      existing.sumX += node.x;
      existing.sumY += node.y;
      existing.count++;
      tagPositions.set(primaryTag, existing);
    });

    return [...tagPositions.entries()].map(([tag, pos]) => ({
      tag,
      x: pos.sumX / pos.count,
      y: pos.sumY / pos.count - 16,
      color: pos.color,
    }));
  }, [nodes, tagColorMap]);

  // Search filtering
  const searchQuery = search.toLowerCase().trim();
  const matchingIndices = useMemo(() => {
    if (!searchQuery) return null;
    const set = new Set<number>();
    nodes.forEach((n, i) => {
      if (n.entry.title.toLowerCase().includes(searchQuery) ||
          n.entry.tags.some(t => t.toLowerCase().includes(searchQuery))) {
        set.add(i);
      }
    });
    return set;
  }, [nodes, searchQuery]);

  // Screen-space coords
  const toScreen = useCallback((x: number, y: number) => ({
    x: x * transform.k + transform.x,
    y: y * transform.k + transform.y,
  }), [transform]);

  const fromScreen = useCallback((sx: number, sy: number) => ({
    x: (sx - transform.x) / transform.k,
    y: (sy - transform.y) / transform.k,
  }), [transform]);

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.fillStyle = 'rgba(220,215,186,0.015)';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw edges
    for (const edge of edges) {
      const a = nodes[edge.source];
      const b = nodes[edge.target];
      const isHoverEdge = hoveredIdx !== null && (edge.source === hoveredIdx || edge.target === hoveredIdx);
      const isSearchDimmed = matchingIndices !== null && (!matchingIndices.has(edge.source) || !matchingIndices.has(edge.target));

      if (isSearchDimmed && !isHoverEdge) {
        ctx.globalAlpha = 0.02;
      } else if (isHoverEdge) {
        ctx.globalAlpha = 0.3 + edge.sharedTags.length * 0.15;
      } else {
        ctx.globalAlpha = 0.06 + edge.sharedTags.length * 0.03;
      }

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = isHoverEdge ? '#DCD7BA' : 'rgba(220,215,186,0.5)';
      ctx.lineWidth = isHoverEdge ? 1.5 / transform.k : 0.5 / transform.k;
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    // Draw cluster labels
    for (const label of clusterLabels) {
      const isSearchMatch = !searchQuery || nodes.some((n, i) => n.entry.tags[0] === label.tag && matchingIndices?.has(i));
      ctx.globalAlpha = isSearchMatch ? 0.35 : 0.08;
      ctx.fillStyle = label.color;
      ctx.font = `500 ${11 / transform.k}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(label.tag, label.x, label.y);
    }

    ctx.globalAlpha = 1;

    // Draw nodes
    nodes.forEach((node, i) => {
      const isHovered = hoveredIdx === i;
      const isSearchMatch = matchingIndices === null || matchingIndices.has(i);
      const isConnectedToHover = hoveredIdx !== null && edges.some(
        e => (e.source === hoveredIdx && e.target === i) || (e.target === hoveredIdx && e.source === i)
      );

      let opacity = 0.7;
      if (matchingIndices !== null && !isSearchMatch) opacity = 0.08;
      if (isHovered) opacity = 1;
      if (isConnectedToHover && !isHovered) opacity = 0.9;

      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();

      if (isHovered) {
        ctx.strokeStyle = '#DCD7BA';
        ctx.lineWidth = 1.5 / transform.k;
        ctx.stroke();
      }
    });

    ctx.globalAlpha = 1;

    // Draw hovered node title
    if (hoveredIdx !== null) {
      const node = nodes[hoveredIdx];
      ctx.fillStyle = '#DCD7BA';
      ctx.font = `600 ${12 / transform.k}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.globalAlpha = 0.9;
      ctx.fillText(node.entry.title, node.x, node.y - node.radius - 8 / transform.k);

      ctx.font = `400 ${9 / transform.k}px "JetBrains Mono", monospace`;
      ctx.globalAlpha = 0.5;
      const date = new Date(node.entry.publishDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      ctx.fillText(`${date} · ${node.entry.wordCount} words`, node.x, node.y - node.radius - 22 / transform.k);
    }

    ctx.restore();
  }, [nodes, edges, clusterLabels, dimensions, transform, hoveredIdx, matchingIndices, searchQuery]);

  // Hit detection
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTransform(t => ({ ...t, x: dragRef.current!.startTx + dx, y: dragRef.current!.startTy + dy }));
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const { x, y } = fromScreen(screenX, screenY);

    let closestIdx: number | null = null;
    let minDist = 12 / transform.k;

    nodes.forEach((node, i) => {
      const dx = node.x - x;
      const dy = node.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    });

    setHoveredIdx(closestIdx);
    canvas.style.cursor = closestIdx !== null ? 'pointer' : 'grab';
  }, [nodes, fromScreen, transform.k]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredIdx !== null) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, startTx: transform.x, startTy: transform.y };
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = 'grabbing';
  }, [hoveredIdx, transform.x, transform.y]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) canvas.style.cursor = hoveredIdx !== null ? 'pointer' : 'grab';
  }, [hoveredIdx]);

  const handleClick = useCallback(() => {
    if (hoveredIdx !== null) {
      window.location.href = `/journal/${nodes[hoveredIdx].entry.slug}`;
    }
  }, [hoveredIdx, nodes]);

  const tagList = useMemo(() => [...tagColorMap.entries()], [tagColorMap]);

  if (entries.length === 0) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'rgba(220,215,186,0.4)', fontSize: '0.875rem' }}>
        No entries to map yet.
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'rgba(220,215,186,0.05)',
            border: '1px solid rgba(220,215,186,0.1)',
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            color: '#DCD7BA',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            outline: 'none',
            flex: '1',
            minWidth: '140px',
            maxWidth: '240px',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => e.target.style.borderColor = 'rgba(220,215,186,0.25)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(220,215,186,0.1)'}
        />
      </div>

      {/* Canvas */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          style={{
            display: 'block',
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: '8px',
            border: '1px solid rgba(220,215,186,0.06)',
            cursor: 'grab',
          }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => { setHoveredIdx(null); dragRef.current = null; }}
          onClick={handleClick}
        />

        {/* Help text */}
        <div style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          fontSize: '0.625rem',
          color: 'rgba(220,215,186,0.2)',
          pointerEvents: 'none',
          fontFamily: 'inherit',
        }}>
          scroll to zoom · drag to pan · click to read
        </div>
      </div>

      {/* Tag Legend */}
      {tagList.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginTop: '0.75rem',
          fontSize: '0.6875rem',
        }}>
          {tagList.map(([tag, color]) => (
            <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'rgba(220,215,186,0.45)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, opacity: 0.7, display: 'inline-block' }} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
