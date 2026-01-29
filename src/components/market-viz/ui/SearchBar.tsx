import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { SignalSnapshot } from '../../trading/types';
import { ASSET_INFO } from '../../../lib/trading/assets';

interface SearchBarProps {
  signals: Record<string, SignalSnapshot>;
  onSelect: (symbol: string) => void;
}

interface SearchResult {
  symbol: string;
  name: string;
  score: number;
  matchRank: number;
}

function rankMatch(symbol: string, name: string, query: string): number {
  const q = query.toLowerCase();
  const s = symbol.toLowerCase();
  const n = name.toLowerCase();

  if (s === q || n === q) return 100;
  if (s.startsWith(q) || n.startsWith(q)) return 80;
  if (s.includes(q) || n.includes(q)) return 50;
  return 0;
}

export default function SearchBar({ signals, onSelect }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(value);
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const results: SearchResult[] = useMemo(() => {
    if (!debouncedQuery.trim()) return [];

    const matches: SearchResult[] = [];
    for (const symbol of Object.keys(signals)) {
      const info = ASSET_INFO[symbol];
      const name = info?.name ?? symbol;
      const matchRank = rankMatch(symbol, name, debouncedQuery);
      if (matchRank > 0) {
        matches.push({
          symbol,
          name,
          score: signals[symbol].combined,
          matchRank,
        });
      }
    }

    matches.sort((a, b) => b.matchRank - a.matchRank || b.score - a.score);
    return matches.slice(0, 8);
  }, [debouncedQuery, signals]);

  useEffect(() => {
    setIsOpen(results.length > 0);
    setSelectedIndex(0);
  }, [results]);

  const selectResult = useCallback(
    (symbol: string) => {
      onSelect(symbol);
      setQuery('');
      setDebouncedQuery('');
      setIsOpen(false);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault();
        selectResult(results[selectedIndex].symbol);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
        setDebouncedQuery('');
      }
    },
    [results, selectedIndex, selectResult]
  );

  return (
    <div className="market-search">
      <div className="market-search-input">
        <span className="search-icon">{'\u2315'}</span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search symbols..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        />
      </div>
      {isOpen && results.length > 0 && (
        <div className="market-search-results market-panel">
          {results.map((result, index) => (
            <div
              key={result.symbol}
              className={`search-result ${index === selectedIndex ? 'selected' : ''}`}
              onMouseDown={() => selectResult(result.symbol)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="result-symbol">{result.symbol}</span>
              <span className="result-name">{result.name}</span>
              <span className="result-score">{result.score.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
