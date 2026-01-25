// Comprehensive trading assets for 24/7 trading
// Includes: S&P 500, NASDAQ-100, Crypto (24/7), Forex, and Futures

// ============================================================
// CRYPTO (24/7 Trading) - Yahoo Finance format: SYMBOL-USD
// ============================================================
export const CRYPTO_SYMBOLS = [
  // Major cryptocurrencies
  'BTC-USD', // Bitcoin
  'ETH-USD', // Ethereum
  'BNB-USD', // Binance Coin
  'XRP-USD', // Ripple
  'SOL-USD', // Solana
  'ADA-USD', // Cardano
  'DOGE-USD', // Dogecoin
  'AVAX-USD', // Avalanche
  'DOT-USD', // Polkadot
  'MATIC-USD', // Polygon
  'LINK-USD', // Chainlink
  'SHIB-USD', // Shiba Inu
  'LTC-USD', // Litecoin
  'ATOM-USD', // Cosmos
  'UNI-USD', // Uniswap
  'XLM-USD', // Stellar
  'NEAR-USD', // NEAR Protocol
  'APT-USD', // Aptos
  'OP-USD', // Optimism
  'ARB-USD', // Arbitrum
  'FIL-USD', // Filecoin
  'HBAR-USD', // Hedera
  'ICP-USD', // Internet Computer
  'VET-USD', // VeChain
  'AAVE-USD', // Aave
  'MKR-USD', // Maker
  'GRT-USD', // The Graph
  'INJ-USD', // Injective
  'RUNE-USD', // THORChain
  'FTM-USD', // Fantom
] as const;

// ============================================================
// FOREX (24/5 Trading - Closed weekends) - Yahoo Finance format: PAIR=X
// ============================================================
export const FOREX_SYMBOLS = [
  // Major pairs (most liquid)
  'EURUSD=X', // Euro/USD
  'GBPUSD=X', // British Pound/USD
  'USDJPY=X', // USD/Japanese Yen
  'USDCHF=X', // USD/Swiss Franc
  'AUDUSD=X', // Australian Dollar/USD
  'USDCAD=X', // USD/Canadian Dollar
  'NZDUSD=X', // New Zealand Dollar/USD
  // Cross pairs
  'EURGBP=X', // Euro/British Pound
  'EURJPY=X', // Euro/Japanese Yen
  'GBPJPY=X', // British Pound/Japanese Yen
  'AUDJPY=X', // Australian Dollar/Japanese Yen
  'CADJPY=X', // Canadian Dollar/Japanese Yen
  'EURAUD=X', // Euro/Australian Dollar
  'EURCHF=X', // Euro/Swiss Franc
  'GBPCHF=X', // British Pound/Swiss Franc
  // Emerging market pairs
  'USDMXN=X', // USD/Mexican Peso
  'USDZAR=X', // USD/South African Rand
  'USDTRY=X', // USD/Turkish Lira
  'USDINR=X', // USD/Indian Rupee
  'USDCNY=X', // USD/Chinese Yuan
] as const;

// ============================================================
// FUTURES - Yahoo Finance format: SYMBOL=F
// ============================================================
export const FUTURES_SYMBOLS = [
  // Index futures
  'ES=F', // E-mini S&P 500
  'NQ=F', // E-mini NASDAQ-100
  'YM=F', // Mini Dow Jones
  'RTY=F', // E-mini Russell 2000
  // Commodity futures
  'GC=F', // Gold
  'SI=F', // Silver
  'CL=F', // Crude Oil WTI
  'BZ=F', // Brent Crude Oil
  'NG=F', // Natural Gas
  'HG=F', // Copper
  'PL=F', // Platinum
  // Agricultural futures
  'ZC=F', // Corn
  'ZW=F', // Wheat
  'ZS=F', // Soybeans
  // Bond futures
  'ZB=F', // 30-Year T-Bond
  'ZN=F', // 10-Year T-Note
  // Currency futures
  '6E=F', // Euro FX
  '6B=F', // British Pound
  '6J=F', // Japanese Yen
] as const;

// ============================================================
// NASDAQ-100 (Additional stocks not in S&P 500)
// ============================================================
export const NASDAQ_ADDITIONAL = [
  // These are NASDAQ-100 stocks not already in S&P 500
  'MELI', // MercadoLibre
  'WDAY', // Workday
  'ZS', // Zscaler
  'DXCM', // DexCom
  'TEAM', // Atlassian
  'SIRI', // Sirius XM
  'PCAR', // PACCAR
  'LCID', // Lucid Group
  'RIVN', // Rivian
  'OKTA', // Okta
  'ZM', // Zoom Video
  'DOCU', // DocuSign
  'SPLK', // Splunk
  'ROKU', // Roku
  'NET', // Cloudflare
  'CRSP', // CRISPR Therapeutics
  'ILMN', // Illumina
  'ALGN', // Align Technology
  'ENPH', // Enphase Energy
  'ANSS', // ANSYS
  'CPRT', // Copart
  'CSGP', // CoStar Group
  'VRSK', // Verisk Analytics
  'FAST', // Fastenal
  'ODFL', // Old Dominion Freight
  'DLTR', // Dollar Tree
  'EBAY', // eBay
  'TTWO', // Take-Two Interactive
  'EA', // Electronic Arts
  'WBD', // Warner Bros Discovery
  'SGEN', // Seagen
  'BIIB', // Biogen
  'IDXX', // IDEXX Laboratories
  'MNST', // Monster Beverage
  'KHC', // Kraft Heinz
  'KDP', // Keurig Dr Pepper
  'MDLZ', // Mondelez
  'PDD', // PDD Holdings (Pinduoduo)
  'JD', // JD.com
  'BIDU', // Baidu
  'NTES', // NetEase
  'TCOM', // Trip.com
  'VRSN', // VeriSign
  'ASML', // ASML Holding
  'MRVL', // Marvell Technology
  'FTNT', // Fortinet
  'PAYX', // Paychex
  'CTAS', // Cintas
] as const;

// ============================================================
// S&P 500 SYMBOLS (Full list)
// ============================================================
export const SP500_SYMBOLS = [
  // Mega Cap Tech
  'NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'AVGO', 'TSLA',
  // Financials & Healthcare Leaders
  'BRK-B', 'LLY', 'WMT', 'JPM', 'V', 'XOM', 'JNJ', 'ORCL', 'MA', 'MU', 'COST',
  // Tech
  'AMD', 'PLTR', 'ABBV', 'HD', 'BAC', 'NFLX', 'PG', 'CVX', 'UNH', 'KO',
  'GE', 'CSCO', 'CAT', 'MS', 'GS', 'LRCX', 'IBM', 'PM', 'WFC', 'MRK',
  'RTX', 'AMAT', 'AXP', 'TMO', 'INTC', 'MCD', 'CRM', 'LIN', 'TMUS', 'KLAC',
  'C', 'PEP', 'BA', 'DIS', 'ABT', 'ISRG', 'AMGN', 'APH', 'SCHW', 'GEV',
  'APP', 'NEE', 'TXN', 'BLK', 'ACN', 'ANET', 'UBER', 'TJX', 'GILD', 'T',
  'VZ', 'QCOM', 'DHR', 'BKNG', 'SPGI', 'INTU', 'LOW', 'ADI', 'PFE', 'HON',
  'NOW', 'DE', 'BSX', 'LMT', 'UNP', 'COF', 'SYK', 'NEM', 'MDT', 'ETN',
  'WELL', 'PANW', 'ADBE', 'COP', 'PGR', 'VRTX', 'CB', 'PLD', 'PH', 'BX',
  'CRWD', 'BMY', 'SBUX', 'KKR', 'HCA', 'CMCSA', 'CVS', 'CEG', 'ADP', 'MO',
  'CME', 'MCK', 'ICE', 'GD', 'SO', 'NKE', 'HOOD', 'NOC', 'SNPS', 'MCO',
  'WM', 'UPS', 'DUK', 'MRSH', 'DASH', 'PNC', 'FCX', 'CDNS', 'HWM', 'SHW',
  'MMM', 'USB', 'MAR', 'TT', 'ORLY', 'AMT', 'EMR', 'ELV', 'CRH', 'BK',
  'WDC', 'ABNB', 'TDG', 'MNST', 'GLW', 'ECL', 'WMB', 'REGN', 'APO', 'CMI',
  'RCL', 'EQIX', 'CTAS', 'DELL', 'STX', 'MDLZ', 'ITW', 'CI', 'GM', 'SLB',
  'AON', 'FDX', 'WBD', 'PWR', 'CL', 'JCI', 'HLT', 'COR', 'CSX', 'RSG',
  'CVNA', 'MSI', 'LHX', 'KMI', 'TEL', 'AJG', 'NSC', 'PCAR', 'TFC', 'AEP',
  'AZO', 'ROST', 'FTNT', 'TRV', 'SPG', 'EOG', 'NXPI', 'COIN', 'URI', 'APD',
  'BDX', 'ADSK', 'VLO', 'PSX', 'AFL', 'SRE', 'NDAQ', 'O', 'IDXX', 'DLR',
  'ZTS', 'VST', 'CMG', 'F', 'BKR', 'PYPL', 'MPC', 'EA', 'MPWR', 'D',
  'AME', 'ALL', 'FAST', 'CBRE', 'GWW', 'MET', 'WDAY', 'PSA', 'CAH', 'OKE',
  'TGT', 'AXON', 'EW', 'CTVA', 'CARR', 'ROK', 'AMP', 'DDOG', 'TTWO', 'EXC',
  'DAL', 'XEL', 'MSCI', 'FANG', 'ROP', 'DHI', 'OXY', 'YUM', 'EL', 'EBAY',
  'ETR', 'NUE', 'TRGP', 'KR', 'CTSH', 'LVS', 'MCHP', 'CPRT', 'IQV', 'GRMN',
  'VMC', 'FIX', 'WAB', 'MLM', 'PEG', 'AIG', 'HSY', 'A', 'PAYX', 'KDP',
  'CCI', 'PRU', 'ED', 'CCL', 'RMD', 'FICO', 'KEYS', 'SYY', 'ODFL', 'FISV',
  'GEHC', 'VTR', 'TER', 'HIG', 'WEC', 'OTIS', 'STT', 'UAL', 'EQT', 'IBKR',
  'IR', 'XYL', 'ARES', 'LYV', 'KVUE', 'KMB', 'ACGL', 'FITB', 'RJF', 'EXPE',
  'MTB', 'PCG', 'ADM', 'DG', 'HUM', 'FIS', 'EME', 'WTW', 'VICI', 'ULTA',
  'VRSK', 'ROL', 'EXR', 'CBOE', 'TSCO', 'MTD', 'TDY', 'NRG', 'HAL', 'DXCM',
  'DOV', 'HPE', 'DTE', 'CSGP', 'NTRS', 'IRM', 'LEN', 'SYF', 'STZ', 'KHC',
  'HBAN', 'BRO', 'FE', 'CFG', 'PPL', 'ATO', 'TPR', 'STLD', 'ES', 'EXE',
  'FSLR', 'HUBB', 'JBL', 'EFX', 'DLTR', 'WRB', 'STE', 'CNP', 'AWK', 'AVB',
  'PPG', 'BIIB', 'VLTO', 'OMC', 'ON', 'CHTR', 'CINF', 'LDOS', 'WSM', 'PHM',
  'DVN', 'BR', 'TPL', 'RF', 'GIS', 'DRI', 'EQR', 'EIX', 'WAT', 'KEY',
  'VRSN', 'TROW', 'SW', 'IP', 'CNC', 'CPAY', 'LULU', 'ALB', 'RL', 'CHD',
  'LH', 'BG', 'TSN', 'LUV', 'CMS', 'EXPD', 'GPN', 'L', 'NVR', 'CTRA',
  'CHRW', 'NI', 'AMCR', 'PKG', 'DGX', 'DOW', 'PFG', 'INCY', 'SBAC', 'JBHT',
  'NTAP', 'PTC', 'WY', 'SNA', 'GPC', 'PODD', 'MRNA', 'SMCI', 'IFF', 'TYL',
  'DD', 'LII', 'HPQ', 'TTD', 'PNR', 'EVRG', 'FTV', 'LNT', 'ZBH', 'WST',
  'TRMB', 'HOLX', 'TXT', 'INVH', 'APTV', 'HII', 'LYB', 'CDW', 'ESS', 'MKC',
  'J', 'TKO', 'COO', 'MAA', 'GEN', 'FOX', 'BALL', 'VTRS', 'FOXA', 'NDSN',
  'FFIV', 'IEX', 'AES', 'ALGN', 'AOS', 'ARE', 'AWI', 'BAX', 'BBWI', 'BEN',
  'BWA', 'CAG', 'CE', 'CF', 'CPB', 'CPT', 'CRL', 'CZR', 'DAY', 'DECK',
  'DFS', 'DPZ', 'ENPH', 'EPAM', 'ERIE', 'ETSY', 'FBIN', 'FDS', 'FFBC',
  'FMC', 'FRT', 'GDDY', 'GL', 'GNRC', 'HAS', 'HSIC', 'HST', 'HRL', 'HWE',
  'IPG', 'IVZ', 'JKHY', 'K', 'KIM', 'KMX', 'LEG', 'LEVI', 'LPLA', 'LW',
  'MAS', 'MGM', 'MHK', 'MKTX', 'MOH', 'MOS', 'MRO', 'MTCH', 'MTN', 'NCLH',
  'NWS', 'NWSA', 'PAYC', 'PEAK', 'PENN', 'POOL', 'REG', 'RVTY', 'SJM',
  'SPB', 'SWKS', 'TAP', 'TECH', 'TFX', 'TFS', 'TPH', 'UDR', 'UHS', 'UTHR',
  'VFC', 'WYNN', 'XPO', 'ZS',
] as const;

// ============================================================
// COMBINED EXPORTS
// ============================================================

// All tradeable symbols combined
export const ALL_SYMBOLS = [
  ...SP500_SYMBOLS,
  ...NASDAQ_ADDITIONAL,
  ...CRYPTO_SYMBOLS,
  ...FOREX_SYMBOLS,
  ...FUTURES_SYMBOLS,
] as const;

// Asset type for categorization
export type AssetType = 'stock' | 'crypto' | 'forex' | 'futures';

// Get asset type from symbol
export function getAssetType(symbol: string): AssetType {
  if (symbol.endsWith('-USD') && CRYPTO_SYMBOLS.includes(symbol as typeof CRYPTO_SYMBOLS[number])) {
    return 'crypto';
  }
  if (symbol.endsWith('=X')) {
    return 'forex';
  }
  if (symbol.endsWith('=F')) {
    return 'futures';
  }
  return 'stock';
}

// Check if asset trades 24/7
export function is24_7Asset(symbol: string): boolean {
  return getAssetType(symbol) === 'crypto';
}

// Check if asset trades on weekends (only crypto does)
export function tradesOnWeekend(symbol: string): boolean {
  return getAssetType(symbol) === 'crypto';
}

// ============================================================
// ASSET INFO (Names and categories)
// ============================================================
export const ASSET_INFO: Record<string, { name: string; category: string }> = {
  // Crypto
  'BTC-USD': { name: 'Bitcoin', category: 'Crypto' },
  'ETH-USD': { name: 'Ethereum', category: 'Crypto' },
  'BNB-USD': { name: 'Binance Coin', category: 'Crypto' },
  'XRP-USD': { name: 'Ripple', category: 'Crypto' },
  'SOL-USD': { name: 'Solana', category: 'Crypto' },
  'ADA-USD': { name: 'Cardano', category: 'Crypto' },
  'DOGE-USD': { name: 'Dogecoin', category: 'Crypto' },
  'AVAX-USD': { name: 'Avalanche', category: 'Crypto' },
  'DOT-USD': { name: 'Polkadot', category: 'Crypto' },
  'MATIC-USD': { name: 'Polygon', category: 'Crypto' },
  'LINK-USD': { name: 'Chainlink', category: 'Crypto' },
  'SHIB-USD': { name: 'Shiba Inu', category: 'Crypto' },
  'LTC-USD': { name: 'Litecoin', category: 'Crypto' },
  'ATOM-USD': { name: 'Cosmos', category: 'Crypto' },
  'UNI-USD': { name: 'Uniswap', category: 'Crypto' },
  'XLM-USD': { name: 'Stellar', category: 'Crypto' },
  'NEAR-USD': { name: 'NEAR Protocol', category: 'Crypto' },
  'APT-USD': { name: 'Aptos', category: 'Crypto' },
  'OP-USD': { name: 'Optimism', category: 'Crypto' },
  'ARB-USD': { name: 'Arbitrum', category: 'Crypto' },
  'FIL-USD': { name: 'Filecoin', category: 'Crypto' },
  'HBAR-USD': { name: 'Hedera', category: 'Crypto' },
  'ICP-USD': { name: 'Internet Computer', category: 'Crypto' },
  'VET-USD': { name: 'VeChain', category: 'Crypto' },
  'AAVE-USD': { name: 'Aave', category: 'Crypto' },
  'MKR-USD': { name: 'Maker', category: 'Crypto' },
  'GRT-USD': { name: 'The Graph', category: 'Crypto' },
  'INJ-USD': { name: 'Injective', category: 'Crypto' },
  'RUNE-USD': { name: 'THORChain', category: 'Crypto' },
  'FTM-USD': { name: 'Fantom', category: 'Crypto' },

  // Forex
  'EURUSD=X': { name: 'EUR/USD', category: 'Forex' },
  'GBPUSD=X': { name: 'GBP/USD', category: 'Forex' },
  'USDJPY=X': { name: 'USD/JPY', category: 'Forex' },
  'USDCHF=X': { name: 'USD/CHF', category: 'Forex' },
  'AUDUSD=X': { name: 'AUD/USD', category: 'Forex' },
  'USDCAD=X': { name: 'USD/CAD', category: 'Forex' },
  'NZDUSD=X': { name: 'NZD/USD', category: 'Forex' },
  'EURGBP=X': { name: 'EUR/GBP', category: 'Forex' },
  'EURJPY=X': { name: 'EUR/JPY', category: 'Forex' },
  'GBPJPY=X': { name: 'GBP/JPY', category: 'Forex' },
  'AUDJPY=X': { name: 'AUD/JPY', category: 'Forex' },
  'CADJPY=X': { name: 'CAD/JPY', category: 'Forex' },
  'EURAUD=X': { name: 'EUR/AUD', category: 'Forex' },
  'EURCHF=X': { name: 'EUR/CHF', category: 'Forex' },
  'GBPCHF=X': { name: 'GBP/CHF', category: 'Forex' },
  'USDMXN=X': { name: 'USD/MXN', category: 'Forex' },
  'USDZAR=X': { name: 'USD/ZAR', category: 'Forex' },
  'USDTRY=X': { name: 'USD/TRY', category: 'Forex' },
  'USDINR=X': { name: 'USD/INR', category: 'Forex' },
  'USDCNY=X': { name: 'USD/CNY', category: 'Forex' },

  // Futures
  'ES=F': { name: 'S&P 500 E-mini', category: 'Futures' },
  'NQ=F': { name: 'NASDAQ-100 E-mini', category: 'Futures' },
  'YM=F': { name: 'Dow Jones Mini', category: 'Futures' },
  'RTY=F': { name: 'Russell 2000 E-mini', category: 'Futures' },
  'GC=F': { name: 'Gold', category: 'Futures' },
  'SI=F': { name: 'Silver', category: 'Futures' },
  'CL=F': { name: 'Crude Oil WTI', category: 'Futures' },
  'BZ=F': { name: 'Brent Crude Oil', category: 'Futures' },
  'NG=F': { name: 'Natural Gas', category: 'Futures' },
  'HG=F': { name: 'Copper', category: 'Futures' },
  'PL=F': { name: 'Platinum', category: 'Futures' },
  'ZC=F': { name: 'Corn', category: 'Futures' },
  'ZW=F': { name: 'Wheat', category: 'Futures' },
  'ZS=F': { name: 'Soybeans', category: 'Futures' },
  'ZB=F': { name: 'Treasury Bond 30Y', category: 'Futures' },
  'ZN=F': { name: 'Treasury Note 10Y', category: 'Futures' },
  '6E=F': { name: 'Euro FX', category: 'Futures' },
  '6B=F': { name: 'British Pound', category: 'Futures' },
  '6J=F': { name: 'Japanese Yen', category: 'Futures' },

  // Mega Cap Tech Stocks
  NVDA: { name: 'NVIDIA Corporation', category: 'Technology' },
  AAPL: { name: 'Apple Inc.', category: 'Technology' },
  MSFT: { name: 'Microsoft Corporation', category: 'Technology' },
  AMZN: { name: 'Amazon.com Inc.', category: 'Consumer Cyclical' },
  GOOGL: { name: 'Alphabet Inc. Class A', category: 'Technology' },
  GOOG: { name: 'Alphabet Inc. Class C', category: 'Technology' },
  META: { name: 'Meta Platforms Inc.', category: 'Technology' },
  AVGO: { name: 'Broadcom Inc.', category: 'Technology' },
  TSLA: { name: 'Tesla Inc.', category: 'Consumer Cyclical' },

  // Financials
  'BRK-B': { name: 'Berkshire Hathaway Class B', category: 'Financial' },
  JPM: { name: 'JPMorgan Chase & Co.', category: 'Financial' },
  V: { name: 'Visa Inc.', category: 'Financial' },
  MA: { name: 'Mastercard Inc.', category: 'Financial' },
  BAC: { name: 'Bank of America Corp.', category: 'Financial' },
  WFC: { name: 'Wells Fargo & Co.', category: 'Financial' },
  GS: { name: 'Goldman Sachs Group', category: 'Financial' },
  MS: { name: 'Morgan Stanley', category: 'Financial' },
  BLK: { name: 'BlackRock Inc.', category: 'Financial' },
  AXP: { name: 'American Express Co.', category: 'Financial' },
  C: { name: 'Citigroup Inc.', category: 'Financial' },
  SCHW: { name: 'Charles Schwab Corp.', category: 'Financial' },
  COF: { name: 'Capital One Financial', category: 'Financial' },
  COIN: { name: 'Coinbase Global', category: 'Financial' },
  HOOD: { name: 'Robinhood Markets', category: 'Financial' },
  PYPL: { name: 'PayPal Holdings', category: 'Financial' },

  // Healthcare
  LLY: { name: 'Eli Lilly and Co.', category: 'Healthcare' },
  UNH: { name: 'UnitedHealth Group', category: 'Healthcare' },
  JNJ: { name: 'Johnson & Johnson', category: 'Healthcare' },
  PFE: { name: 'Pfizer Inc.', category: 'Healthcare' },
  ABBV: { name: 'AbbVie Inc.', category: 'Healthcare' },
  MRK: { name: 'Merck & Co. Inc.', category: 'Healthcare' },
  TMO: { name: 'Thermo Fisher Scientific', category: 'Healthcare' },
  ABT: { name: 'Abbott Laboratories', category: 'Healthcare' },
  DHR: { name: 'Danaher Corporation', category: 'Healthcare' },
  BMY: { name: 'Bristol-Myers Squibb', category: 'Healthcare' },
  ISRG: { name: 'Intuitive Surgical', category: 'Healthcare' },
  AMGN: { name: 'Amgen Inc.', category: 'Healthcare' },
  GILD: { name: 'Gilead Sciences', category: 'Healthcare' },
  VRTX: { name: 'Vertex Pharmaceuticals', category: 'Healthcare' },
  REGN: { name: 'Regeneron Pharmaceuticals', category: 'Healthcare' },

  // Consumer
  WMT: { name: 'Walmart Inc.', category: 'Consumer Defensive' },
  PG: { name: 'Procter & Gamble Co.', category: 'Consumer Defensive' },
  KO: { name: 'Coca-Cola Company', category: 'Consumer Defensive' },
  PEP: { name: 'PepsiCo Inc.', category: 'Consumer Defensive' },
  COST: { name: 'Costco Wholesale Corp.', category: 'Consumer Defensive' },
  HD: { name: 'Home Depot Inc.', category: 'Consumer Cyclical' },
  MCD: { name: "McDonald's Corporation", category: 'Consumer Cyclical' },
  NKE: { name: 'Nike Inc.', category: 'Consumer Cyclical' },
  SBUX: { name: 'Starbucks Corporation', category: 'Consumer Cyclical' },
  TGT: { name: 'Target Corporation', category: 'Consumer Defensive' },
  LOW: { name: "Lowe's Companies", category: 'Consumer Cyclical' },
  TJX: { name: 'TJX Companies', category: 'Consumer Cyclical' },

  // Energy
  XOM: { name: 'Exxon Mobil Corporation', category: 'Energy' },
  CVX: { name: 'Chevron Corporation', category: 'Energy' },
  COP: { name: 'ConocoPhillips', category: 'Energy' },
  SLB: { name: 'Schlumberger Limited', category: 'Energy' },
  EOG: { name: 'EOG Resources', category: 'Energy' },
  OXY: { name: 'Occidental Petroleum', category: 'Energy' },

  // Industrial
  CAT: { name: 'Caterpillar Inc.', category: 'Industrial' },
  BA: { name: 'Boeing Company', category: 'Industrial' },
  UNP: { name: 'Union Pacific Corp.', category: 'Industrial' },
  HON: { name: 'Honeywell International', category: 'Industrial' },
  GE: { name: 'General Electric Co.', category: 'Industrial' },
  RTX: { name: 'RTX Corporation', category: 'Industrial' },
  LMT: { name: 'Lockheed Martin Corp.', category: 'Industrial' },
  DE: { name: 'Deere & Company', category: 'Industrial' },

  // More Tech
  ORCL: { name: 'Oracle Corporation', category: 'Technology' },
  CRM: { name: 'Salesforce Inc.', category: 'Technology' },
  CSCO: { name: 'Cisco Systems', category: 'Technology' },
  IBM: { name: 'IBM Corporation', category: 'Technology' },
  INTC: { name: 'Intel Corporation', category: 'Technology' },
  AMD: { name: 'Advanced Micro Devices', category: 'Technology' },
  QCOM: { name: 'Qualcomm Inc.', category: 'Technology' },
  TXN: { name: 'Texas Instruments', category: 'Technology' },
  ADBE: { name: 'Adobe Inc.', category: 'Technology' },
  NOW: { name: 'ServiceNow Inc.', category: 'Technology' },
  INTU: { name: 'Intuit Inc.', category: 'Technology' },
  MU: { name: 'Micron Technology', category: 'Technology' },
  AMAT: { name: 'Applied Materials', category: 'Technology' },
  LRCX: { name: 'Lam Research', category: 'Technology' },
  KLAC: { name: 'KLA Corporation', category: 'Technology' },
  ADI: { name: 'Analog Devices', category: 'Technology' },
  SNPS: { name: 'Synopsys Inc.', category: 'Technology' },
  CDNS: { name: 'Cadence Design Systems', category: 'Technology' },
  NFLX: { name: 'Netflix Inc.', category: 'Communication Services' },
  PLTR: { name: 'Palantir Technologies', category: 'Technology' },
  PANW: { name: 'Palo Alto Networks', category: 'Technology' },
  CRWD: { name: 'CrowdStrike Holdings', category: 'Technology' },

  // Communication Services
  T: { name: 'AT&T Inc.', category: 'Communication Services' },
  VZ: { name: 'Verizon Communications', category: 'Communication Services' },
  TMUS: { name: 'T-Mobile US', category: 'Communication Services' },
  DIS: { name: 'Walt Disney Company', category: 'Communication Services' },
  CMCSA: { name: 'Comcast Corporation', category: 'Communication Services' },

  // Utilities
  NEE: { name: 'NextEra Energy', category: 'Utilities' },
  DUK: { name: 'Duke Energy Corp.', category: 'Utilities' },
  SO: { name: 'Southern Company', category: 'Utilities' },

  // Real Estate
  PLD: { name: 'Prologis Inc.', category: 'Real Estate' },
  AMT: { name: 'American Tower Corp.', category: 'Real Estate' },
  EQIX: { name: 'Equinix Inc.', category: 'Real Estate' },

  // Other notable stocks
  UBER: { name: 'Uber Technologies', category: 'Technology' },
  ABNB: { name: 'Airbnb Inc.', category: 'Consumer Cyclical' },
  DASH: { name: 'DoorDash Inc.', category: 'Consumer Cyclical' },
  GM: { name: 'General Motors', category: 'Consumer Cyclical' },
  F: { name: 'Ford Motor Company', category: 'Consumer Cyclical' },
  CVS: { name: 'CVS Health Corp.', category: 'Healthcare' },

  // NASDAQ Additional
  MELI: { name: 'MercadoLibre', category: 'Consumer Cyclical' },
  TEAM: { name: 'Atlassian', category: 'Technology' },
  LCID: { name: 'Lucid Group', category: 'Consumer Cyclical' },
  RIVN: { name: 'Rivian Automotive', category: 'Consumer Cyclical' },
  OKTA: { name: 'Okta Inc.', category: 'Technology' },
  ZM: { name: 'Zoom Video Communications', category: 'Technology' },
  DOCU: { name: 'DocuSign Inc.', category: 'Technology' },
  ROKU: { name: 'Roku Inc.', category: 'Communication Services' },
  NET: { name: 'Cloudflare Inc.', category: 'Technology' },
  CRSP: { name: 'CRISPR Therapeutics', category: 'Healthcare' },
  ILMN: { name: 'Illumina Inc.', category: 'Healthcare' },
  ASML: { name: 'ASML Holding', category: 'Technology' },
  MRVL: { name: 'Marvell Technology', category: 'Technology' },
  PDD: { name: 'PDD Holdings', category: 'Consumer Cyclical' },
  JD: { name: 'JD.com', category: 'Consumer Cyclical' },
  BIDU: { name: 'Baidu Inc.', category: 'Technology' },
};

// Get asset info with fallback
export function getAssetInfo(symbol: string): { name: string; category: string } {
  return ASSET_INFO[symbol] || { name: symbol, category: getAssetType(symbol) === 'stock' ? 'Stock' : getAssetType(symbol).charAt(0).toUpperCase() + getAssetType(symbol).slice(1) };
}

// Get category/sector for a symbol
export function getAssetCategory(symbol: string): string {
  return ASSET_INFO[symbol]?.category || 'Unknown';
}

// For backwards compatibility with existing code
export const STOCK_INFO = ASSET_INFO;
export function getStockInfo(symbol: string): { name: string; sector: string } {
  const info = getAssetInfo(symbol);
  return { name: info.name, sector: info.category };
}
export function getStockSector(symbol: string): string {
  return getAssetCategory(symbol);
}
