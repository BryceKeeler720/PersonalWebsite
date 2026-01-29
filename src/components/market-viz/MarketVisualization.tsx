import { useEffect, useRef, useState, useCallback } from 'react';
import type { SignalSnapshot, AssetMetric } from '../trading/types';
import type { FilterState } from './dataTransforms';
import type { PresetName } from './PresetManager';
import { MarketScene } from './MarketScene';
import D3Heatmap from './D3Heatmap';
import ViewToggle from './ui/ViewToggle';
import SearchBar from './ui/SearchBar';
import FilterPanel from './ui/FilterPanel';
import DetailPanel from './ui/DetailPanel';
import PresetButtons from './ui/PresetButtons';
import Legend from './ui/Legend';
import ConnectionStatus from './ui/ConnectionStatus';
import HoverTooltip from './ui/HoverTooltip';
import './MarketVisualization.css';

interface MarketData {
  signals: Record<string, SignalSnapshot>;
  metrics: Record<string, AssetMetric>;
  timestamp: string;
}

type ViewMode = '2d' | '3d';
type WSStatus = 'connecting' | 'connected' | 'disconnected';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WS_URL: string = (import.meta as any).env?.PUBLIC_WS_URL || '';
const API_URL = '/api/trading/market-data';
const POLL_INTERVAL = 30_000;
const MAX_WS_RECONNECT_ATTEMPTS = 3;

export default function MarketVisualization() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MarketScene | null>(null);

  const [data, setData] = useState<MarketData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [hoveredAsset, setHoveredAsset] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [activePreset, setActivePreset] = useState<PresetName>('default');
  const [filters, setFilters] = useState<FilterState>({
    assetClasses: ['stock', 'crypto', 'forex', 'futures'],
    minSignal: -1,
  });
  const [wsStatus, setWsStatus] = useState<WSStatus>('connecting');
  const [lastUpdate, setLastUpdate] = useState<string | undefined>();

  // -----------------------------------------------------------------------
  // Three.js scene lifecycle (3D mode)
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (viewMode !== '3d' || !containerRef.current) {
      // Dispose scene when switching to 2D
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
      return;
    }

    const scene = new MarketScene(containerRef.current, {
      onHover: (symbol) => {
        setHoveredAsset(symbol);
      },
      onClick: (symbol) => {
        setSelectedAsset(symbol);
      },
    });
    sceneRef.current = scene;

    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, [viewMode]);

  // Track mouse position for 3D hover tooltip
  useEffect(() => {
    if (viewMode !== '3d') return;
    const handler = (e: PointerEvent) => {
      if (hoveredAsset) {
        setHoverPos({ x: e.clientX, y: e.clientY });
      }
    };
    window.addEventListener('pointermove', handler, { passive: true });
    return () => window.removeEventListener('pointermove', handler);
  }, [viewMode, hoveredAsset]);

  // -----------------------------------------------------------------------
  // Data fetching: WebSocket + HTTP fallback
  // -----------------------------------------------------------------------
  const applyDelta = useCallback((delta: Partial<MarketData>) => {
    setData((prev) => {
      if (!prev) return null;
      const newSignals = { ...prev.signals };
      const newMetrics = { ...prev.metrics };

      if (delta.signals) {
        for (const [sym, sig] of Object.entries(delta.signals)) {
          if (sig === null) {
            delete newSignals[sym];
          } else {
            newSignals[sym] = sig as SignalSnapshot;
          }
        }
      }

      if (delta.metrics) {
        for (const [sym, met] of Object.entries(delta.metrics)) {
          if (met === null) {
            delete newMetrics[sym];
          } else {
            newMetrics[sym] = met as AssetMetric;
          }
        }
      }

      return {
        signals: newSignals,
        metrics: newMetrics,
        timestamp: delta.timestamp || prev.timestamp,
      };
    });
  }, []);

  // HTTP polling fallback
  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData({
        signals: json.signals || {},
        metrics: json.metrics || {},
        timestamp: json.timestamp,
      });
      setLastUpdate(json.timestamp);
    } catch (err) {
      console.error('[MarketViz] Fetch error:', err);
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 1000;
    let reconnectAttempts = 0;
    let disposed = false;

    const startPolling = () => {
      if (pollTimer) return;
      fetchData();
      pollTimer = setInterval(fetchData, POLL_INTERVAL);
      setWsStatus('disconnected');
    };

    const stopPolling = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };

    const connectWs = () => {
      if (disposed || !WS_URL) {
        startPolling();
        return;
      }

      setWsStatus('connecting');

      try {
        ws = new WebSocket(WS_URL);
      } catch {
        startPolling();
        return;
      }

      ws.onopen = () => {
        if (disposed) return;
        setWsStatus('connected');
        reconnectDelay = 1000;
        reconnectAttempts = 0;
        stopPolling();
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'snapshot') {
            setData({
              signals: msg.data.signals || {},
              metrics: msg.data.metrics || {},
              timestamp: msg.data.timestamp,
            });
            setLastUpdate(msg.data.timestamp);
          } else if (msg.type === 'delta') {
            applyDelta(msg.data);
            setLastUpdate(msg.data.timestamp);
          }
        } catch (err) {
          console.error('[MarketViz] WS parse error:', err);
        }
      };

      ws.onclose = () => {
        if (disposed) return;
        setWsStatus('disconnected');
        reconnectAttempts++;

        if (reconnectAttempts > MAX_WS_RECONNECT_ATTEMPTS) {
          startPolling();
          return;
        }

        reconnectTimer = setTimeout(() => {
          reconnectDelay = Math.min(reconnectDelay * 2, 30000);
          connectWs();
        }, reconnectDelay);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    // Always fetch initial data immediately
    fetchData();
    connectWs();

    return () => {
      disposed = true;
      ws?.close();
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [fetchData, applyDelta]);

  // -----------------------------------------------------------------------
  // Push data to Three.js scene
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!sceneRef.current || !data || viewMode !== '3d') return;
    const signalsArray = Object.values(data.signals);
    const metricsMap = new Map(Object.entries(data.metrics));
    sceneRef.current.updateData(signalsArray, metricsMap, filters);
  }, [data, filters, viewMode]);

  // -----------------------------------------------------------------------
  // Preset changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!sceneRef.current || viewMode !== '3d') return;
    sceneRef.current.applyPreset(activePreset);
  }, [activePreset, viewMode]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  const handleSearch = useCallback((symbol: string) => {
    setSelectedAsset(symbol);
    if (sceneRef.current && viewMode === '3d') {
      sceneRef.current.flyTo(symbol);
    }
  }, [viewMode]);

  const handleHeatmapHover = useCallback((symbol: string | null, x: number, y: number) => {
    setHoveredAsset(symbol);
    setHoverPos({ x, y });
  }, []);

  const handleHeatmapClick = useCallback((symbol: string) => {
    setSelectedAsset(symbol);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  const signalCount = data ? Object.keys(data.signals).length : 0;

  return (
    <div className="market-viz">
      {/* 3D canvas container */}
      {viewMode === '3d' && <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute' }} />}

      {/* 2D heatmap */}
      {viewMode === '2d' && data && (
        <D3Heatmap
          signals={data.signals}
          metrics={data.metrics}
          filters={filters}
          onHover={handleHeatmapHover}
          onClick={handleHeatmapClick}
          highlightSymbol={selectedAsset}
        />
      )}

      {/* Loading state */}
      {!data && (
        <div className="market-viz-loading">
          <div className="loading-spinner" />
          <p>Loading market data...</p>
        </div>
      )}

      {/* Overlay UI */}
      <div className="market-viz-overlay">
        {/* Top bar */}
        <div className="market-viz-topbar">
          <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          <SearchBar signals={data?.signals ?? {}} onSelect={handleSearch} />
          <PresetButtons
            active={activePreset}
            onChange={(p) => setActivePreset(p as PresetName)}
            visible={viewMode === '3d'}
          />
        </div>

        {/* Filter panel */}
        <FilterPanel filters={filters} onChange={setFilters} />

        {/* Detail panel */}
        {selectedAsset && data && (
          <DetailPanel
            symbol={selectedAsset}
            signal={data.signals[selectedAsset]}
            metric={data.metrics[selectedAsset]}
            onClose={() => setSelectedAsset(null)}
          />
        )}

        {/* Hover tooltip */}
        {hoveredAsset && data && (
          <HoverTooltip
            symbol={hoveredAsset}
            signal={data.signals[hoveredAsset]}
            metric={data.metrics[hoveredAsset]}
            x={hoverPos.x}
            y={hoverPos.y}
          />
        )}

        {/* Legend */}
        <Legend viewMode={viewMode} />

        {/* Stats bar */}
        {data && (
          <div className="market-stats market-panel">
            <div className="market-stats-item">
              <span className="market-stats-label">Assets:</span>
              <span className="market-stats-value">{signalCount.toLocaleString()}</span>
            </div>
            <div className="market-stats-item">
              <span className="market-stats-label">View:</span>
              <span className="market-stats-value">{viewMode.toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Connection status */}
        <ConnectionStatus status={wsStatus} lastUpdate={lastUpdate} />
      </div>
    </div>
  );
}
