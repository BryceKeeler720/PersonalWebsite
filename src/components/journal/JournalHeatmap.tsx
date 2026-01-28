import { useState, useMemo, useCallback } from 'react';

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

function getIntensityColor(wordCount: number, maxWords: number): string {
  if (wordCount === 0) return 'rgba(255, 255, 255, 0.03)';
  const ratio = Math.min(wordCount / Math.max(maxWords, 1), 1);
  if (ratio < 0.25) return 'rgba(34, 197, 94, 0.25)';
  if (ratio < 0.5) return 'rgba(34, 197, 94, 0.45)';
  if (ratio < 0.75) return 'rgba(34, 197, 94, 0.65)';
  return 'rgba(34, 197, 94, 0.9)';
}

function getYearRange(entries: JournalEntryData[]): { min: number; max: number } {
  if (entries.length === 0) return { min: new Date().getFullYear(), max: new Date().getFullYear() };
  const years = entries.map(e => new Date(e.publishDate).getFullYear());
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
    const filtered = entries.filter(e => new Date(e.publishDate).getFullYear() === selectedYear);

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
      const dateStr = d.toISOString().split('T')[0];
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
        const month = new Date(day.date).getMonth();
        if (month !== lastMonth) {
          positions.push({ label: MONTH_LABELS[month], x: weekIdx });
          lastMonth = month;
        }
        break;
      }
    });

    return positions;
  }, [weeks]);

  const handleMouseEnter = useCallback((day: { date: string; entries: JournalEntryData[] }, weekIdx: number, dayIdx: number) => {
    if (!day.date) return;
    setHoveredDay({
      date: day.date,
      entries: day.entries,
      x: weekIdx * (CELL_SIZE + CELL_GAP) + 32,
      y: dayIdx * (CELL_SIZE + CELL_GAP) + 24,
    });
  }, []);

  const svgWidth = weeks.length * (CELL_SIZE + CELL_GAP) + 40;
  const svgHeight = 7 * (CELL_SIZE + CELL_GAP) + 32;

  return (
    <div style={{ width: '100%' }}>
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
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{yearEntries.length}</span>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginLeft: '0.5rem' }}>
              {yearEntries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <div>
            <span style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>{totalWords.toLocaleString()}</span>
            <span style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.5)', marginLeft: '0.5rem' }}>words</span>
          </div>
        </div>

        {/* Year Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <button
            onClick={() => setSelectedYear(y => Math.max(y - 1, yearRange.min))}
            disabled={selectedYear <= yearRange.min}
            style={{
              background: 'none',
              border: 'none',
              color: selectedYear <= yearRange.min ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
              cursor: selectedYear <= yearRange.min ? 'default' : 'pointer',
              fontSize: '1rem',
              padding: '0.25rem 0.5rem',
              transition: 'color 0.2s ease',
              fontFamily: 'inherit',
            }}
            aria-label="Previous year"
          >
            ←
          </button>
          <span style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: '#fff',
            minWidth: '4ch',
            textAlign: 'center',
          }}>
            {selectedYear}
          </span>
          <button
            onClick={() => setSelectedYear(y => Math.min(y + 1, yearRange.max))}
            disabled={selectedYear >= yearRange.max}
            style={{
              background: 'none',
              border: 'none',
              color: selectedYear >= yearRange.max ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
              cursor: selectedYear >= yearRange.max ? 'default' : 'pointer',
              fontSize: '1rem',
              padding: '0.25rem 0.5rem',
              transition: 'color 0.2s ease',
              fontFamily: 'inherit',
            }}
            aria-label="Next year"
          >
            →
          </button>
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ position: 'relative', overflowX: 'auto', overflowY: 'visible' }}>
        <svg
          width={svgWidth}
          height={svgHeight}
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
              fill="rgba(255,255,255,0.4)"
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
                fill="rgba(255,255,255,0.3)"
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
              const today = new Date().toISOString().split('T')[0];
              const isFuture = day.date > today;
              return (
                <rect
                  key={`${weekIdx}-${dayIdx}`}
                  x={weekIdx * (CELL_SIZE + CELL_GAP) + 32}
                  y={dayIdx * (CELL_SIZE + CELL_GAP) + 16}
                  width={CELL_SIZE}
                  height={CELL_SIZE}
                  rx={2}
                  fill={isFuture ? 'rgba(255,255,255,0.01)' : getIntensityColor(day.wordCount, maxWords)}
                  style={{ cursor: day.entries.length > 0 ? 'pointer' : 'default', transition: 'fill 0.15s ease' }}
                  onMouseEnter={() => handleMouseEnter(day, weekIdx, dayIdx)}
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
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.6)', marginBottom: hoveredDay.entries.length > 0 ? '0.25rem' : 0 }}>
              {new Date(hoveredDay.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            {hoveredDay.entries.length > 0 ? (
              hoveredDay.entries.map((e, i) => (
                <div key={i} style={{ color: 'rgba(34, 197, 94, 0.9)' }}>
                  {e.title} · {e.wordCount} words
                </div>
              ))
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)' }}>No entries</div>
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
        color: 'rgba(255,255,255,0.35)',
      }}>
        <span>Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((level, i) => (
          <div
            key={i}
            style={{
              width: 10,
              height: 10,
              borderRadius: 2,
              background: level === 0 ? 'rgba(255,255,255,0.03)' :
                level < 0.3 ? 'rgba(34,197,94,0.25)' :
                level < 0.55 ? 'rgba(34,197,94,0.45)' :
                level < 0.8 ? 'rgba(34,197,94,0.65)' :
                'rgba(34,197,94,0.9)',
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
