import type { SignalSnapshot, AssetMetric } from '../trading/types';
import { getClusterPosition, getSubCategory } from '../../lib/trading/sectorMap';
import { getAssetType } from '../../lib/trading/assets';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstanceEntry {
  symbol: string;
  x: number;
  y: number;
  z: number;
  scale: number;
  r: number;
  g: number;
  b: number;
}

export interface FilterState {
  assetClasses: string[];
  minSignal: number;
  sectors?: string[];
  signalTypes?: string[];
}

// ---------------------------------------------------------------------------
// Color constants (high-contrast heatmap)
// ---------------------------------------------------------------------------

const KANA_RED = { r: 0.85, g: 0.15, b: 0.15 }; // #D92626 — strong red
const KANA_YELLOW = { r: 0.45, g: 0.45, b: 0.50 }; // #737380 — visible neutral gray
const KANA_GREEN = { r: 0.10, g: 0.72, b: 0.35 }; // #1AB859 — strong green

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple deterministic hash for a symbol string.
 * Returns a positive 32-bit integer.
 */
export function hashSymbol(symbol: string): number {
  let hash = 5381;
  for (let i = 0; i < symbol.length; i++) {
    // hash * 33 + charCode  (djb2)
    hash = ((hash << 5) + hash + symbol.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Map a combined signal score (-1 .. +1) to an RGB color using the Kanagawa
 * palette with three stops: red -> yellow -> green.
 */
export function signalToColor(combined: number): { r: number; g: number; b: number } {
  // Clamp to [-1, 1]
  const t = Math.max(-1, Math.min(1, combined));

  if (t <= 0) {
    // Interpolate red -> yellow  (t: -1 .. 0  =>  lerp factor: 0 .. 1)
    const f = t + 1; // 0..1
    return {
      r: KANA_RED.r + (KANA_YELLOW.r - KANA_RED.r) * f,
      g: KANA_RED.g + (KANA_YELLOW.g - KANA_RED.g) * f,
      b: KANA_RED.b + (KANA_YELLOW.b - KANA_RED.b) * f,
    };
  }

  // Interpolate yellow -> green  (t: 0 .. 1  =>  lerp factor: 0 .. 1)
  return {
    r: KANA_YELLOW.r + (KANA_GREEN.r - KANA_YELLOW.r) * t,
    g: KANA_YELLOW.g + (KANA_GREEN.g - KANA_YELLOW.g) * t,
    b: KANA_YELLOW.b + (KANA_GREEN.b - KANA_YELLOW.b) * t,
  };
}

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------

function passesFilters(
  signal: SignalSnapshot,
  metric: AssetMetric | undefined,
  filters: FilterState,
): boolean {
  // Asset class filter
  if (filters.assetClasses.length > 0) {
    const assetType = getAssetType(signal.symbol);
    const matchesClass = filters.assetClasses.some(
      (cls) => cls === assetType || cls === 'all',
    );
    if (!matchesClass) return false;
  }

  // Minimum signal strength
  if (Math.abs(signal.combined) < filters.minSignal) {
    return false;
  }

  // Sector filter
  if (filters.sectors && filters.sectors.length > 0) {
    const sub = getSubCategory(signal.symbol);
    if (!filters.sectors.includes(sub)) return false;
  }

  // Signal type filter (recommendation)
  if (filters.signalTypes && filters.signalTypes.length > 0) {
    if (!filters.signalTypes.includes(signal.recommendation)) return false;
  }

  // Suppress entries with no metric data when we need price info
  if (!metric) return false;

  return true;
}

// ---------------------------------------------------------------------------
// ATR normalization
// ---------------------------------------------------------------------------

function normalizeATR(atr: number | undefined): number {
  if (atr === undefined || atr <= 0) return 0.5;
  // Log-scale normalize to [0.3, 2.0]
  const logATR = Math.log1p(atr); // ln(1 + atr)
  const minLog = 0; // log1p(0)
  const maxLog = Math.log1p(50); // reasonable upper bound
  const normalized = (logATR - minLog) / (maxLog - minLog);
  return 0.3 + Math.min(1, Math.max(0, normalized)) * (2.0 - 0.3);
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

function buildClusterLayout(
  symbol: string,
  signal: SignalSnapshot,
  metric: AssetMetric,
): { x: number; y: number; z: number } {
  const cluster = getClusterPosition(symbol);
  const h = hashSymbol(symbol);

  // Deterministic jitter within the cluster (range ~[-6, 6])
  const jitterX = ((h % 1000) / 1000 - 0.5) * 12;
  const jitterZ = (((h >> 10) % 1000) / 1000 - 0.5) * 12;

  const y = Math.max(-20, Math.min(20, metric.changePercent * 1.5));

  return {
    x: cluster.x + jitterX,
    y,
    z: cluster.z + jitterZ,
  };
}

function buildFlatGridLayout(
  symbol: string,
  index: number,
  _totalCount: number,
): { x: number; y: number; z: number } {
  const cols = Math.ceil(Math.sqrt(_totalCount));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const spacing = 2.5;

  return {
    x: (col - cols / 2) * spacing,
    y: 0,
    z: (row - cols / 2) * spacing,
  };
}

// ---------------------------------------------------------------------------
// Main transform
// ---------------------------------------------------------------------------

export type LayoutMode = 'cluster' | 'flat-grid';

/**
 * Convert raw trading signals + metrics into a flat array of InstanceEntry
 * objects ready for the 3D instanced cube field.
 */
export function transformToInstances(
  signals: SignalSnapshot[],
  metrics: Map<string, AssetMetric>,
  filters: FilterState,
  layoutMode: LayoutMode = 'cluster',
): InstanceEntry[] {
  const entries: InstanceEntry[] = [];

  // For flat-grid, first collect qualifying entries to sort them
  const qualifying: { signal: SignalSnapshot; metric: AssetMetric }[] = [];

  for (const signal of signals) {
    const metric = metrics.get(signal.symbol);
    if (!passesFilters(signal, metric, filters)) continue;
    qualifying.push({ signal, metric: metric! });
  }

  if (layoutMode === 'flat-grid') {
    // Sort by sector then by signal strength
    qualifying.sort((a, b) => {
      const sA = getSubCategory(a.signal.symbol);
      const sB = getSubCategory(b.signal.symbol);
      if (sA !== sB) return sA.localeCompare(sB);
      return b.signal.combined - a.signal.combined;
    });

    for (let i = 0; i < qualifying.length; i++) {
      const { signal, metric } = qualifying[i];
      const pos = buildFlatGridLayout(signal.symbol, i, qualifying.length);
      const color = signalToColor(signal.combined);
      const scale = normalizeATR(metric.atr);

      entries.push({
        symbol: signal.symbol,
        ...pos,
        scale,
        ...color,
      });
    }
  } else {
    // cluster layout
    for (const { signal, metric } of qualifying) {
      const pos = buildClusterLayout(signal.symbol, signal, metric);
      const color = signalToColor(signal.combined);
      const scale = normalizeATR(metric.atr);

      entries.push({
        symbol: signal.symbol,
        ...pos,
        scale,
        ...color,
      });
    }
  }

  return entries;
}
