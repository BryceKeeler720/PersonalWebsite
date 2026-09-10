import { useState, useMemo, useCallback, useRef } from 'react';

function formatLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface JournalEntryData {
  slug: string;
  title: string;
  publishDate: string;
  tags: string[];
  wordCount: number;
}

interface JournalHeatmapProps {
  entries: JournalEntryData[];
}

const CELL_SIZE = 10;
const CELL_GAP = 2;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Grayscale intensity ramp built from theme vars so both themes work.
const INTENSITY_RAMP = ['var(--ghost)', 'var(--faint)', 'var(--dim)', 'var(--ink)', 'var(--bone)'];

function getIntensityColor(wordCount: number, maxWords: number): string {
  if (wordCount === 0) return INTENSITY_RAMP[0];
  const ratio = Math.min(wordCount / Math.max(maxWords, 1), 1);
  if (ratio < 0.25) return INTENSITY_RAMP[1];
  if (ratio < 0.5) return INTENSITY_RAMP[2];
  if (ratio < 0.75) return INTENSITY_RAMP[3];
  return INTENSITY_RAMP[4];
}

function getYearRange(entries: JournalEntryData[]): { min: number; max: number } {
  if (entries.length === 0) return { min: new Date().getFullYear(), max: new Date().getFullYear() };
  const years = entries.map(e => parseInt(e.publishDate.split('-')[0], 10));
  return { min: Math.min(...years), max: Math.max(...years) };
}

export default function JournalHeatmap({ entries }: JournalHeatmapProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; entries: JournalEntryData[]; x: number; y: number } | null>(null);

  const yearRange = useMemo(() => {
    const range = getYearRange(entries);
    return { min: Math.min(range.min, currentYear), max: Math.max(range.max, currentYear) };
  }, [entries, currentYear]);

  const { dayMap, maxWords, yearEntries, totalWords } = useMemo(() => {
    const map = new Map<string, JournalEntryData[]>();
    let max = 0;
    const filtered = entries.filter(e => parseInt(e.publishDate.split('-')[0], 10) === selectedYear);

    filtered.forEach(entry => {
      const dateKey = entry.publishDate.split('T')[0];
      const existing = map.get(dateKey) || [];
      existing.push(entry);
      map.set(dateKey, existing);
      const dayTotal = existing.reduce((sum, e) => sum + e.wordCount, 0);
      if (dayTotal > max) max = dayTotal;
    });

    const total = filtered.reduce((sum, e) => sum + e.wordCount, 0);
    return { dayMap: map, maxWords: max, yearEntries: filtered, totalWords: total };
  }, [entries, selectedYear]);

  const weeks = useMemo(() => {
    const startDate = new Date(selectedYear, 0, 1);
    const endDate = new Date(selectedYear, 11, 31);
    const startDay = startDate.getDay();

    const grid: { date: string; wordCount: number; entries: JournalEntryData[] }[][] = [];
    let currentWeek: { date: string; wordCount: number; entries: JournalEntryData[] }[] = [];

    // Pad first week
    for (let i = 0; i < startDay; i++) {
      currentWeek.push({ date: '', wordCount: 0, entries: [] });
    }

    const d = new Date(startDate);
    while (d <= endDate) {
      const dateStr = formatLocalDate(d);
      const dayEntries = dayMap.get(dateStr) || [];
      const wordCount = dayEntries.reduce((sum, e) => sum + e.wordCount, 0);

      currentWeek.push({ date: dateStr, wordCount, entries: dayEntries });

      if (currentWeek.length === 7) {
        grid.push(currentWeek);
        currentWeek = [];
      }

      d.setDate(d.getDate() + 1);
    }

    // Pad last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({ date: '', wordCount: 0, entries: [] });
      }
      grid.push(currentWeek);
    }

    return grid;
  }, [selectedYear, dayMap]);

  const monthPositions = useMemo(() => {
    const positions: { label: string; x: number }[] = [];
    let lastMonth = -1;

    weeks.forEach((week, weekIdx) => {
      for (const day of week) {
        if (!day.date) continue;
        const month = parseInt(day.date.split('-')[1], 10) - 1;
        if (month !== lastMonth) {
          positions.push({ label: MONTH_LABELS[month], x: weekIdx });
          lastMonth = month;
        }
        break;
      }
    });

    return positions;
  }, [weeks]);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = useCallback((e: React.MouseEvent, day: { date: string; entries: JournalEntryData[] }) => {
    if (!day.date || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoveredDay({
      date: day.date,
      entries: day.entries,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const svgWidth = weeks.length * (CELL_SIZE + CELL_GAP) + 40;
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + 32;

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .jh-nav {
          background: transparent;
          border: 1px solid var(--faint);
          border-radius: 0;
          color: var(--ink);
          font-family: inherit;
          font-size: 0.875rem;
          padding: 0.15rem 0.6rem;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .jh-nav:hover:not(:disabled) { background: var(--bone); color: var(--void); }
        .jh-nav:disabled { color: var(--ghost); border-color: var(--ghost); cursor: default; }
      `}</style>
      {/* Stats Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div>
            <span style={{ fontSize: '1.75rem', fontWeight: 400, color: 'var(--bone)' }}>{yearEntries.length}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--dim)', marginLeft: '0.5rem' }}>
              {yearEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '1.75rem', fontWeight: 400, color: 'var(--bone)' }}>{totalWords.toLocaleString()}</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--dim)', marginLeft: '0.5rem' }}>words</span>
          </div>
        </div>

        {/* Year Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <button
            className="jh-nav"
            onClick={() => setSelectedYear(y => Math.max(y - 1, yearRange.min))}
            disabled={selectedYear <= yearRange.min}
            aria-label="Previous year"
          >
            ←
          </button>
          <span style={{
            fontSize: '1rem',
            fontWeight: 400,
            color: 'var(--bone)',
            letterSpacing: '0.3ch',
            minWidth: '4ch',
            textAlign: 'center',
          }}>
            {selectedYear}
          </span>
          <button
            className="jh-nav"
            onClick={() => setSelectedYear(y => Math.min(y + 1, yearRange.max))}
            disabled={selectedYear >= yearRange.max}
            aria-label="Next year"
          >
            →
          </button>
        </div>
      </div>

      {/* Heatmap */}
      <div ref={containerRef} style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          width="100%"
          style={{ display: 'block' }}
          role="img"
          aria-label={`Journal contribution heatmap for ${selectedYear}`}
        >
          {/* Month labels */}
          {monthPositions.map((mp, i) => (
            <text
              key={i}
              x={mp.x * (CELL_SIZE + CELL_GAP) + 32}
              y={10}
              fill="var(--dim)"
              fontSize="10"
              fontFamily="inherit"
            >
              {mp.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            label && (
              <text
                key={i}
                x={0}
                y={i * (CELL_SIZE + CELL_GAP) + 24 + CELL_SIZE - 2}
                fill="var(--dim)"
                fontSize="9"
                fontFamily="inherit"
              >
                {label}
              </text>
            )
          ))}

          {/* Grid cells */}
          {weeks.map((week, weekIdx) =>
            week.map((day, dayIdx) => {
              if (!day.date) return null;
              const today = formatLocalDate(new Date());
              const isFuture = day.date > today;
              return (
                <rect
                  key={`${weekIdx}-${dayIdx}`}
                  x={weekIdx * (CELL_SIZE + CELL_GAP) + 32}
                  y={dayIdx * (CELL_SIZE + CELL_GAP) + 16}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={0}
                  fill={isFuture ? 'transparent' : getIntensityColor(day.wordCount, maxWords)}
                  style={{ cursor: day.entries.length > 0 ? 'pointer' : 'default', transition: 'fill 0.15s ease' }}
                  onMouseEnter={(e) => handleMouseEnter(e, day)}
                  onMouseLeave={() => setHoveredDay(null)}
                  onClick={() => {
                    if (day.entries.length === 1) {
                      window.location.href = `/journal/${day.entries[0].slug}`;
                    }
                  }}
                />
              );
            })
          )}
        </svg>

        {/* Tooltip */}
        {hoveredDay && (
          <div
            style={{
              position: 'absolute',
              left: hoveredDay.x,
              top: hoveredDay.y - 40,
              transform: 'translateX(-50%)',
              background: 'var(--kana-bg)',
              border: '1px solid var(--faint)',
              borderRadius: 0,
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              color: 'var(--ink)',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          >
            <div style={{ color: 'var(--dim)', marginBottom: hoveredDay.entries.length > 0 ? '0.25rem' : 0 }}>
              {new Date(hoveredDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {hoveredDay.entries.length > 0 ? (
              hoveredDay.entries.map((e, i) => (
                <div key={i} style={{ color: 'var(--bone)' }}>
                  {e.title} · {e.wordCount} words
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--dim)' }}>No entries</div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '0.375rem',
        marginTop: '0.75rem',
        fontSize: '0.6875rem',
        color: 'var(--dim)',
      }}>
        <span>Less</span>
        {INTENSITY_RAMP.map((bg, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 0,
              background: bg,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
