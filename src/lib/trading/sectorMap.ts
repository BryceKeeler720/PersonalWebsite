import { ASSET_INFO, getAssetType } from './assets';
import type { AssetType } from './assets';

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

export type AssetClass = AssetType; // 'stock' | 'crypto' | 'forex' | 'futures'

export const GICS_SECTORS = [
  'Technology',
  'Healthcare',
  'Financial',
  'Energy',
  'Industrial',
  'Consumer Cyclical',
  'Consumer Defensive',
  'Communication Services',
  'Utilities',
  'Real Estate',
  'Materials',
] as const;

export type GICSSector = (typeof GICS_SECTORS)[number];

export type SubCategory =
  | GICSSector
  // Crypto
  | 'L1'
  | 'L2'
  | 'DeFi'
  | 'Meme'
  | 'AI'
  | 'Infrastructure'
  | 'Exchange Tokens'
  | 'Privacy'
  | 'Gaming'
  // Futures
  | 'Indices'
  | 'Energy'
  | 'Metals'
  | 'Agriculture'
  | 'Bonds'
  | 'Currency'
  // Forex
  | 'Majors'
  | 'Crosses'
  | 'Emerging'
  // Fallback
  | 'Other';

export interface ClusterPosition {
  x: number;
  z: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Sub-category maps for non-stock asset classes
// ---------------------------------------------------------------------------

export const CRYPTO_SUB_CATEGORIES: Record<string, string> = {
  // L1
  'BTC-USD': 'L1',
  'ETH-USD': 'L1',
  'SOL-USD': 'L1',
  'ADA-USD': 'L1',
  'AVAX-USD': 'L1',
  'DOT-USD': 'L1',
  'NEAR-USD': 'L1',
  'APT-USD': 'L1',
  'SUI-USD': 'L1',
  'SEI-USD': 'L1',
  'TON-USD': 'L1',
  'TRX-USD': 'L1',
  'BCH-USD': 'L1',
  'ETC-USD': 'L1',
  'NEO-USD': 'L1',
  'TIA-USD': 'L1',
  'ALGO-USD': 'L1',
  'EGLD-USD': 'L1',
  'MINA-USD': 'L1',
  'FLOW-USD': 'L1',
  'EOS-USD': 'L1',
  'XTZ-USD': 'L1',
  'XRP-USD': 'L1',
  'BNB-USD': 'L1',
  'XLM-USD': 'L1',
  'LTC-USD': 'L1',
  'STX-USD': 'L1',
  'KAS-USD': 'L1',
  'KAVA-USD': 'L1',
  'ZEC-USD': 'L1',

  // L2
  'OP-USD': 'L2',
  'ARB-USD': 'L2',
  'MATIC-USD': 'L2',
  'STRK-USD': 'L2',
  'IMX-USD': 'L2',

  // DeFi
  'UNI-USD': 'DeFi',
  'AAVE-USD': 'DeFi',
  'MKR-USD': 'DeFi',
  'CRV-USD': 'DeFi',
  'LDO-USD': 'DeFi',
  'SNX-USD': 'DeFi',
  'COMP-USD': 'DeFi',
  'SUSHI-USD': 'DeFi',
  'YFI-USD': 'DeFi',
  'BAL-USD': 'DeFi',
  'UMA-USD': 'DeFi',
  '1INCH-USD': 'DeFi',
  'DYDX-USD': 'DeFi',
  'ENS-USD': 'DeFi',
  'RPL-USD': 'DeFi',
  'GMX-USD': 'DeFi',
  'JUP-USD': 'DeFi',
  'PENDLE-USD': 'DeFi',
  'ONDO-USD': 'DeFi',

  // Meme
  'DOGE-USD': 'Meme',
  'SHIB-USD': 'Meme',
  'PEPE-USD': 'Meme',
  'WIF-USD': 'Meme',
  'BONK-USD': 'Meme',
  'FLOKI-USD': 'Meme',

  // AI
  'TAO-USD': 'AI',
  'FET-USD': 'AI',
  'RNDR-USD': 'AI',
  'OCEAN-USD': 'AI',
  'AGIX-USD': 'AI',
  'WLD-USD': 'AI',

  // Infrastructure
  'LINK-USD': 'Infrastructure',
  'GRT-USD': 'Infrastructure',
  'FIL-USD': 'Infrastructure',
  'HBAR-USD': 'Infrastructure',
  'ICP-USD': 'Infrastructure',
  'ATOM-USD': 'Infrastructure',
  'VET-USD': 'Infrastructure',
  'THETA-USD': 'Infrastructure',
  'INJ-USD': 'Infrastructure',
  'RUNE-USD': 'Infrastructure',
  'ANKR-USD': 'Infrastructure',
  'STORJ-USD': 'Infrastructure',
  'BAT-USD': 'Infrastructure',
  'CELO-USD': 'Infrastructure',
  'ROSE-USD': 'Infrastructure',
  'ONE-USD': 'Infrastructure',

  // Gaming
  'AXS-USD': 'Gaming',
  'SAND-USD': 'Gaming',
  'MANA-USD': 'Gaming',
  'ENJ-USD': 'Gaming',
  'CHZ-USD': 'Gaming',
  'GALA-USD': 'Gaming',

  // Exchange Tokens
  'CRO-USD': 'Exchange Tokens',
  'OKB-USD': 'Exchange Tokens',

  // Privacy
  'XMR-USD': 'Privacy',
  'DASH-USD': 'Privacy',
  'ZIL-USD': 'Privacy',
  'IOTA-USD': 'Privacy',
};

export const FUTURES_SUB_CATEGORIES: Record<string, string> = {
  // Indices
  'ES=F': 'Indices',
  'NQ=F': 'Indices',
  'YM=F': 'Indices',
  'RTY=F': 'Indices',
  'VIX=F': 'Indices',
  'NIKKEI=F': 'Indices',

  // Energy
  'CL=F': 'Energy',
  'BZ=F': 'Energy',
  'NG=F': 'Energy',
  'HO=F': 'Energy',
  'RB=F': 'Energy',

  // Metals
  'GC=F': 'Metals',
  'SI=F': 'Metals',
  'HG=F': 'Metals',
  'PL=F': 'Metals',
  'PA=F': 'Metals',

  // Agriculture
  'ZC=F': 'Agriculture',
  'ZW=F': 'Agriculture',
  'ZS=F': 'Agriculture',
  'ZM=F': 'Agriculture',
  'ZL=F': 'Agriculture',
  'CT=F': 'Agriculture',
  'KC=F': 'Agriculture',
  'SB=F': 'Agriculture',
  'CC=F': 'Agriculture',
  'OJ=F': 'Agriculture',
  'LC=F': 'Agriculture',
  'LH=F': 'Agriculture',
  'FC=F': 'Agriculture',
  'ZO=F': 'Agriculture',
  'ZR=F': 'Agriculture',
  'LBS=F': 'Agriculture',

  // Bonds
  'ZB=F': 'Bonds',
  'ZN=F': 'Bonds',
  'ZF=F': 'Bonds',
  'ZT=F': 'Bonds',

  // Currency
  '6E=F': 'Currency',
  '6B=F': 'Currency',
  '6J=F': 'Currency',
  '6A=F': 'Currency',
  '6C=F': 'Currency',
  '6S=F': 'Currency',
  '6N=F': 'Currency',
  '6M=F': 'Currency',
  'DX=F': 'Currency',
  'BTC=F': 'Currency',
  'ETH=F': 'Currency',
};

export const FOREX_SUB_CATEGORIES: Record<string, string> = {
  // Majors
  'EURUSD=X': 'Majors',
  'GBPUSD=X': 'Majors',
  'USDJPY=X': 'Majors',
  'USDCHF=X': 'Majors',
  'AUDUSD=X': 'Majors',
  'USDCAD=X': 'Majors',
  'NZDUSD=X': 'Majors',

  // Crosses
  'EURGBP=X': 'Crosses',
  'EURJPY=X': 'Crosses',
  'GBPJPY=X': 'Crosses',
  'AUDJPY=X': 'Crosses',
  'CADJPY=X': 'Crosses',
  'EURAUD=X': 'Crosses',
  'EURCHF=X': 'Crosses',
  'GBPCHF=X': 'Crosses',
  'NZDJPY=X': 'Crosses',
  'GBPAUD=X': 'Crosses',
  'EURCZD=X': 'Crosses',
  'AUDNZD=X': 'Crosses',
  'GBPCAD=X': 'Crosses',
  'AUDCAD=X': 'Crosses',
  'CHFJPY=X': 'Crosses',
  'EURNZD=X': 'Crosses',
  'GBPNZD=X': 'Crosses',

  // Emerging
  'USDMXN=X': 'Emerging',
  'USDZAR=X': 'Emerging',
  'USDTRY=X': 'Emerging',
  'USDINR=X': 'Emerging',
  'USDCNY=X': 'Emerging',
  'USDSGD=X': 'Emerging',
  'USDHKD=X': 'Emerging',
  'USDNOK=X': 'Emerging',
  'USDSEK=X': 'Emerging',
  'USDPLN=X': 'Emerging',
  'USDDKK=X': 'Emerging',
  'USDHUF=X': 'Emerging',
  'USDCZK=X': 'Emerging',
  'USDTHB=X': 'Emerging',
  'USDIDR=X': 'Emerging',
  'USDTWD=X': 'Emerging',
  'USDKRW=X': 'Emerging',
  'USDBRL=X': 'Emerging',
  'USDCLP=X': 'Emerging',
  'USDCOP=X': 'Emerging',
};

// ---------------------------------------------------------------------------
// getSubCategory
// ---------------------------------------------------------------------------

/**
 * Returns the sub-category for a symbol.
 * - Stocks: returns the GICS sector from ASSET_INFO
 * - Crypto / Forex / Futures: looks up the dedicated sub-category maps
 * - Falls back to 'Other' when the symbol is not mapped
 */
export function getSubCategory(symbol: string): string {
  const assetType = getAssetType(symbol);

  if (assetType === 'stock') {
    return ASSET_INFO[symbol]?.category ?? 'Other';
  }

  if (assetType === 'crypto') {
    return CRYPTO_SUB_CATEGORIES[symbol] ?? 'Other';
  }

  if (assetType === 'forex') {
    return FOREX_SUB_CATEGORIES[symbol] ?? 'Other';
  }

  if (assetType === 'futures') {
    return FUTURES_SUB_CATEGORIES[symbol] ?? 'Other';
  }

  return 'Other';
}

// ---------------------------------------------------------------------------
// Cluster positions for the 3D market visualization
// ---------------------------------------------------------------------------

export const CLUSTER_POSITIONS: Record<string, ClusterPosition> = {
  // ---- Stocks (center-right, X: 10 to 70) --------------------------------
  Technology:              { x: 15, z:  30, label: 'Technology' },
  Healthcare:              { x: 30, z:  30, label: 'Healthcare' },
  Financial:               { x: 45, z:  30, label: 'Financial' },
  Energy:                  { x: 60, z:  30, label: 'Energy' },
  Industrial:              { x: 15, z:   0, label: 'Industrial' },
  'Consumer Cyclical':     { x: 30, z:   0, label: 'Consumer Cyclical' },
  'Consumer Defensive':    { x: 45, z:   0, label: 'Consumer Defensive' },
  'Communication Services':{ x: 60, z:   0, label: 'Communication Services' },
  Utilities:               { x: 20, z: -30, label: 'Utilities' },
  'Real Estate':           { x: 40, z: -30, label: 'Real Estate' },
  Materials:               { x: 60, z: -30, label: 'Materials' },

  // ---- Crypto (far-left, X: -70 to -30) ----------------------------------
  L1:                { x: -70, z:  25, label: 'Layer 1' },
  L2:                { x: -55, z:  25, label: 'Layer 2' },
  DeFi:              { x: -40, z:  25, label: 'DeFi' },
  Meme:              { x: -70, z:   0, label: 'Meme' },
  AI:                { x: -55, z:   0, label: 'AI' },
  Infrastructure:    { x: -40, z:   0, label: 'Infrastructure' },
  'Exchange Tokens': { x: -65, z: -25, label: 'Exchange Tokens' },
  Privacy:           { x: -50, z: -25, label: 'Privacy' },
  Gaming:            { x: -35, z: -25, label: 'Gaming' },

  // ---- Forex (near-left, X: -30 to -5) -----------------------------------
  Majors:   { x: -25, z:  20, label: 'FX Majors' },
  Crosses:  { x: -12, z:   0, label: 'FX Crosses' },
  Emerging: { x: -20, z: -20, label: 'FX Emerging' },

  // ---- Futures (far-right, X: 70 to 100) ---------------------------------
  Indices:      { x:  75, z:  25, label: 'Index Futures' },
  // "Energy" key is already used by stocks GICS; prefix futures sub-cats
  'Futures Energy':     { x:  90, z:  25, label: 'Energy Futures' },
  Metals:       { x:  75, z:   0, label: 'Metal Futures' },
  Agriculture:  { x:  90, z:   0, label: 'Agriculture Futures' },
  Bonds:        { x:  80, z: -25, label: 'Bond Futures' },
  // "Currency" is unique to futures, but label clarifies context
  Currency:     { x:  95, z: -25, label: 'Currency Futures' },
};

// ---------------------------------------------------------------------------
// getClusterPosition
// ---------------------------------------------------------------------------

/** Default fallback position for unmapped symbols */
const DEFAULT_POSITION: ClusterPosition = { x: 0, z: 0, label: 'Other' };

/**
 * Resolves a symbol to its spatial cluster position in the 3D visualization.
 *
 * Special handling for futures Energy sub-category which would collide
 * with the stock GICS "Energy" sector key.
 */
export function getClusterPosition(symbol: string): ClusterPosition {
  const sub = getSubCategory(symbol);
  const assetType = getAssetType(symbol);

  // Futures "Energy" is stored under a prefixed key to avoid collision
  // with the GICS "Energy" sector used by stocks.
  if (assetType === 'futures' && sub === 'Energy') {
    return CLUSTER_POSITIONS['Futures Energy'] ?? DEFAULT_POSITION;
  }

  return CLUSTER_POSITIONS[sub] ?? DEFAULT_POSITION;
}
