import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { JournalEntryData } from './JournalHeatmap';

interface JournalKnowledgeMapProps {
  entries: JournalEntryData[];
}

const TAG_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#a855f7', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#64748b', // slate
  '#fbbf24', // yellow
];

function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = ((hash << 5) - hash) + tag.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export default function JournalKnowledgeMap({ entries }: JournalKnowledgeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [clustered, setClustered] = useState(false);
  const [hovered, setHovered] = useState<{ entry: JournalEntryData; x: number; y: number } | null>(null);
  const [dimensions, setDimensions] = useState({ width: 700, height: 360 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({ width: Math.max(width, 300), height: 360 });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const tagColorMap = useMemo(() => {
    const allTags = [...new Set(entries.flatMap(e => e.tags))];
    const map = new Map<string, string>();
    allTags.forEach((tag, i) => {
      map.set(tag, TAG_COLORS[i % TAG_COLORS.length]);
    });
    return map;
  }, [entries]);

  const tagList = useMemo(() => [...tagColorMap.entries()], [tagColorMap]);

  const points = useMemo(() => {
    if (entries.length === 0) return [];

    const padding = { left: 16, right: 16, top: 24, bottom: 24 };
    const w = dimensions.width - padding.left - padding.right;
    const h = dimensions.height - padding.top - padding.bottom;

    const dates = entries.map(e => new Date(e.publishDate).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const dateRange = maxDate - minDate || 1;

    const maxWords = Math.max(...entries.map(e => e.wordCount), 1);

    // Assign Y positions based on tag clusters
    const allTags = [...new Set(entries.flatMap(e => e.tags))];
    const tagYPositions = new Map<string, number>();
    allTags.forEach((tag, i) => {
      tagYPositions.set(tag, (i + 0.5) / Math.max(allTags.length, 1));
    });

    return entries.map((entry, idx) => {
      const t = (new Date(entry.publishDate).getTime() - minDate) / dateRange;
      const primaryTag = entry.tags[0] || 'untagged';
      const tagY = tagYPositions.get(primaryTag) ?? 0.5;

      let yPos: number;
      if (clustered) {
        // Tight clustering by tag with small jitter
        const jitter = (seededRandom(idx * 17 + 3) - 0.5) * 0.06;
        yPos = tagY + jitter;
      } else {
        // Spread out with tag influence + more jitter
        const jitter = (seededRandom(idx * 31 + 7) - 0.5) * 0.4;
        yPos = tagY * 0.6 + 0.2 + jitter;
      }

      yPos = Math.max(0.05, Math.min(0.95, yPos));

      const radius = 4 + (entry.wordCount / maxWords) * 8;
      const color = tagColorMap.get(primaryTag) || '#64748b';

      return {
        entry,
        x: padding.left + t * w,
        y: padding.top + yPos * h,
        radius,
        color,
      };
    });
  }, [entries, dimensions, clustered, tagColorMap]);

  const filteredPoints = useMemo(() => {
    if (!search.trim()) return points;
    const q = search.toLowerCase();
    return points.map(p => ({
      ...p,
      dimmed: !p.entry.title.toLowerCase().includes(q) &&
              !p.entry.tags.some(t => t.toLowerCase().includes(q)),
    }));
  }, [points, search]);

  const handleDotHover = useCallback((point: typeof points[0], e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHovered({
      entry: point.entry,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  if (entries.length === 0) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.875rem',
      }}>
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
        marginBottom: '1rem',
        flexWrap: 'wrap',
      }}>
        <input
          type="text"
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            color: '#fff',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            outline: 'none',
            flex: '1',
            minWidth: '140px',
            maxWidth: '240px',
            transition: 'border-color 0.2s ease',
          }}
          onFocus={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.25)'}
          onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button
          onClick={() => setClustered(c => !c)}
          style={{
            background: clustered ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${clustered ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '6px',
            padding: '0.4rem 0.75rem',
            color: clustered ? 'rgba(34,197,94,0.9)' : 'rgba(255,255,255,0.5)',
            fontSize: '0.8125rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Cluster
        </button>
      </div>

      {/* Scatter plot */}
      <div style={{ position: 'relative' }}>
        <svg
          width={dimensions.width}
          height={dimensions.height}
          style={{
            display: 'block',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          role="img"
          aria-label="Knowledge map of journal entries"
        >
          {filteredPoints.map((point, i) => {
            const dimmed = 'dimmed' in point && point.dimmed;
            return (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r={point.radius}
                fill={point.color}
                opacity={dimmed ? 0.1 : 0.7}
                style={{
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease, cx 0.4s ease, cy 0.4s ease',
                }}
                onMouseEnter={(e) => handleDotHover(point, e)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { window.location.href = `/journal/${point.entry.slug}`; }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(hovered.x, dimensions.width - 200),
              top: hovered.y - 60,
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              color: '#fff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
              backdropFilter: 'blur(8px)',
              maxWidth: '260px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hovered.entry.title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6875rem' }}>
              {new Date(hovered.entry.publishDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}
              {hovered.entry.wordCount} words
            </div>
            {hovered.entry.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                {hovered.entry.tags.map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.625rem',
                      padding: '0.1rem 0.4rem',
                      background: 'rgba(255,255,255,0.08)',
                      borderRadius: '3px',
                      color: tagColorMap.get(tag) || 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
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
            <span
              key={tag}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                color: 'rgba(255,255,255,0.45)',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: color,
                opacity: 0.7,
                display: 'inline-block',
              }} />
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
