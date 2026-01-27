#!/usr/bin/env node
/**
 * Trading Bot Script - Self-hosted continuous service
 * Runs as a daemon analyzing 5-min intraday candles via Alpaca
 * Submits paper trades to Alpaca for real execution tracking
 */

import { Redis } from '@upstash/redis';

// Service Configuration
const RUN_INTERVAL_MS = parseInt(process.env.RUN_INTERVAL_MS || '600000', 10); // Default: 10 minutes
const RUN_ONCE = process.env.RUN_ONCE === 'true'; // For GitHub Actions compatibility
let isShuttingDown = false;
let currentRunPromise = null;

// Configuration
const BATCH_SIZE = 50; // Alpaca supports multi-symbol batch requests
const BATCH_DELAY_MS = 350; // Free tier: 200 req/min → ~300ms minimum between requests
const DEFAULT_CONFIG = {
  initialCapital: 10199.52,
  maxPositionSize: 0.07,
  maxPositions: 15,
  minTradeValue: 15,
  targetCashRatio: 0.05,  // 5% cash buffer
  buyThreshold: 0.35,     // Higher bar — only trade on strong signals
  riskPerTrade: 0.01,     // 1% of portfolio risked per position
  atrStopMultiplier: 2,   // Trailing stop = 2×ATR below high water mark
  atrProfit1Multiplier: 3, // Sell 25% at 3×ATR gain
  atrProfit2Multiplier: 5, // Sell 50% at 5×ATR gain
  maxNewPositionsPerCycle: 3, // Cap new buys per analysis cycle
  minHoldBars: 24,        // Minimum 24 bars (2 hours) before selling
  transactionCostBps: 5,  // 5 basis points per side (0.05%)
};

// Regime weights: how much each strategy group contributes based on market regime
const REGIME_WEIGHTS = {
  TRENDING_UP:   { trend: 0.80, reversion: 0.20 },
  TRENDING_DOWN: { trend: 0.80, reversion: 0.20 },
  RANGE_BOUND:   { trend: 0.20, reversion: 0.80 },
  UNKNOWN:       { trend: 0.50, reversion: 0.50 },
};

// Trade cooldown: prevent buying/selling the same symbol within 4 hours
const TRADE_COOLDOWN_MS = 4 * 60 * 60 * 1000;
const tradeCooldowns = new Map(); // symbol → last trade timestamp

// Alpaca API Configuration
const ALPACA_API_KEY = process.env.ALPACA_API_KEY;
const ALPACA_SECRET_KEY = process.env.ALPACA_SECRET_KEY;
const ALPACA_DATA_URL = 'https://data.alpaca.markets';
const ALPACA_PAPER_URL = 'https://paper-api.alpaca.markets';

// Asset lists
const CRYPTO_SYMBOLS = [
  'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'SOL-USD', 'ADA-USD', 'DOGE-USD',
  'AVAX-USD', 'DOT-USD', 'MATIC-USD', 'LINK-USD', 'SHIB-USD', 'LTC-USD',
  'ATOM-USD', 'UNI-USD', 'XLM-USD', 'NEAR-USD', 'APT-USD', 'OP-USD', 'ARB-USD',
  'FIL-USD', 'HBAR-USD', 'ICP-USD', 'VET-USD', 'AAVE-USD', 'MKR-USD', 'GRT-USD',
  'INJ-USD', 'RUNE-USD', 'FTM-USD',
];

// Forex pairs (24/5 Trading - Closed weekends) — Yahoo Finance format: PAIR=X
const FOREX_SYMBOLS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X', 'NZDUSD=X',
  'EURGBP=X', 'EURJPY=X', 'GBPJPY=X', 'AUDJPY=X', 'CADJPY=X', 'EURAUD=X', 'EURCHF=X',
  'GBPCHF=X', 'USDMXN=X', 'USDZAR=X', 'USDTRY=X', 'USDINR=X', 'USDCNY=X',
];

// Futures — Yahoo Finance format: SYMBOL=F
const FUTURES_SYMBOLS = [
  'ES=F', 'NQ=F', 'YM=F', 'RTY=F',   // Index futures
  'GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F', 'HG=F', 'PL=F',  // Commodity futures
  'ZC=F', 'ZW=F', 'ZS=F',             // Agricultural futures
  'ZB=F', 'ZN=F',                      // Bond futures
  '6E=F', '6B=F', '6J=F',             // Currency futures
];

const SP500_SYMBOLS = [
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
];

// Popular ETFs for broader market coverage
const ETF_SYMBOLS = [
  'SPY', 'QQQ', 'IWM', 'DIA', 'VTI', 'VOO', 'VEA', 'VWO', 'EFA', 'EEM',
  'AGG', 'BND', 'LQD', 'HYG', 'TLT', 'IEF', 'SHY', 'TIP', 'GLD', 'SLV',
  'USO', 'UNG', 'XLF', 'XLK', 'XLE', 'XLV', 'XLI', 'XLP', 'XLY', 'XLU',
  'XLB', 'XLRE', 'XLC', 'VNQ', 'ARKK', 'ARKW', 'ARKG', 'ARKF', 'SMH', 'SOXX',
  'IBB', 'XBI', 'KRE', 'KBE', 'XHB', 'ITB', 'HACK', 'BOTZ', 'ROBO', 'KWEB',
  'FXI', 'EWJ', 'EWZ', 'EWY', 'INDA', 'RSX', 'VGK', 'IEMG', 'SCHD', 'VIG',
  'DGRO', 'DVY', 'HDV', 'VYM', 'NOBL', 'MTUM', 'QUAL', 'VLUE', 'SIZE', 'USMV',
];

// NASDAQ Additional stocks (matches frontend dropdown)
const NASDAQ_ADDITIONAL = [
  // NASDAQ-100 Core (not in S&P 500)
  'MELI', 'TEAM', 'LCID', 'RIVN', 'OKTA', 'ZM', 'DOCU', 'ROKU', 'NET',
  'CRSP', 'ASML', 'MRVL', 'PDD', 'JD', 'BIDU', 'NTES', 'TCOM',
  // Growth & Momentum Stocks
  'SOFI', 'UPST', 'AFRM', 'PATH', 'SNOW', 'DKNG', 'RBLX', 'U', 'BILL',
  'HUBS', 'TWLO', 'MDB', 'CFLT', 'GTLB', 'S', 'DUOL', 'PINS', 'SNAP',
  'SPOT', 'LYFT', 'GRAB', 'SE', 'SHOP', 'SQ', 'FUBO',
  // Biotech & Pharma
  'BNTX', 'NVAX', 'SGEN', 'EXAS', 'ALNY', 'SRPT', 'RARE', 'BMRN',
  'NBIX', 'IONS', 'HALO', 'LEGN', 'PCVX', 'KRYS', 'ARWR', 'BGNE',
  'VXRT', 'INO', 'SAVA', 'MGNX', 'NTLA', 'EDIT', 'BEAM', 'PRTA',
  'VCNX', 'IMVT', 'CCCC', 'RCKT', 'RVNC', 'FATE', 'GTHX', 'FOLD',
  'APLS', 'DCPH', 'ROIV', 'XNCR', 'ARQT', 'KROS', 'ARVN', 'CYTK',
  'DAWN', 'EWTX', 'HLVX', 'IMCR', 'INSM', 'ITCI', 'LGND', 'MDGL',
  'MIRM', 'NUVB', 'PTCT', 'RGNX', 'RCUS', 'SRRK', 'VCEL', 'VKTX',
  'VRNA', 'XENE', 'ZLAB', 'ACAD', 'AGEN', 'AKRO', 'ANAB', 'ARDX',
  'AUPH', 'BBIO', 'CLDX', 'CPRX', 'DVAX', 'ENTA', 'EXEL', 'FGEN',
  'GERN', 'HRTX', 'IMGN', 'IOVA', 'IRWD', 'JAZZ', 'KURA', 'MCRB',
  'NKTX', 'OLINK', 'PRAX', 'SAGE', 'TGTX', 'TVTX', 'VCYT', 'XERS',
  // Tech & AI/ML
  'ARM', 'IONQ', 'RGTI', 'AI', 'SOUN', 'BBAI', 'UPWK', 'FVRR', 'WIX',
  'ZI', 'ESTC', 'NEWR', 'ASAN', 'MNDY', 'DOCN', 'FSLY', 'AKAM', 'DBX',
  'BOX', 'SPLK', 'DOMO', 'YEXT', 'ZUO', 'APPN', 'BIGC', 'COUP',
  'FROG', 'NCNO', 'QLYS', 'TENB', 'VRNS', 'ZEN', 'CRDO', 'CWAN',
  'DLO', 'ENVX', 'GCT', 'GENI', 'IOT', 'LSPD', 'MGNI', 'NXST',
  'PAYO', 'PRFT', 'PSTG', 'QLGN', 'RPD', 'SMAR', 'SPSC', 'TASK',
  'TDOC', 'TTEC', 'VERX', 'VTEX', 'WEAV', 'WK', 'YOU', 'ZETA',
  'BASE', 'BRZE', 'CRNC', 'DV', 'EVTC', 'FRSH', 'INFA', 'JAMF',
  'LSCC', 'MANH', 'NTNX', 'PCOR', 'PEGA', 'PLAN', 'RELY', 'SEMR',
  'TOST', 'WULF', 'XPRO', 'APGE', 'AVPT', 'CLSK', 'COTY', 'CPRT',
  // Semiconductors
  'WOLF', 'ACLS', 'ALGM', 'AMKR', 'AOSL', 'ASPN', 'ATOM', 'AXTI',
  'CAMT', 'CRUS', 'DIOD', 'FORM', 'INDI', 'IPGP', 'ISSI', 'ITOS',
  'KLIC', 'LEDS', 'LITE', 'MASI', 'MKSI', 'MTSI', 'NOVT', 'NXPI',
  'OLED', 'ONTO', 'PLAB', 'POWI', 'QRVO', 'RMBS', 'SITM', 'SLAB',
  'SMTC', 'SYNA', 'TER', 'UCTT', 'VECO', 'VIAV', 'VSH', 'WRAP',
  // Consumer & Retail
  'FIVE', 'OLLI', 'RH', 'W', 'CHWY', 'CPNG', 'BABA', 'BGFV', 'BIRD',
  'BOOT', 'BROS', 'CAKE', 'CARS', 'CASA', 'CATO', 'CONN', 'COUR',
  'CURV', 'EAT', 'ELF', 'EVRI', 'FIZZ', 'FOXF', 'FRPT', 'FTDR',
  'GOOS', 'GPRO', 'HAIN', 'HIBB', 'HZO', 'IMKTA', 'JACK', 'LANC',
  'LCUT', 'LEVI', 'LOVE', 'MCBC', 'MED', 'MNST', 'NATH',
  'NCLH', 'ONON', 'ORLY', 'PTON', 'REAL', 'RMNI', 'SABR', 'SAVE',
  'SCVL', 'SHAK', 'SITE', 'SFIX', 'SKYW', 'SNBR', 'SPTN', 'SSYS',
  'STNE', 'SWBI', 'TACO', 'TAST', 'TNET', 'TRIP', 'TXRH', 'VIR',
  'VRNT', 'VSCO', 'WINA', 'WING', 'WOOF', 'WW', 'YELP', 'YETI',
  // EV & Clean Energy
  'NIO', 'XPEV', 'LI', 'FSR', 'GOEV', 'WKHS', 'HYLN', 'CHPT', 'BLNK',
  'EVGO', 'QS', 'PLUG', 'FCEL', 'BE', 'SEDG', 'RUN', 'ARRY', 'BLDP',
  'CLNE', 'ENVX', 'EVEX', 'FLNC', 'FREY', 'GEVO', 'HYZN', 'LEV',
  'LILM', 'MVST', 'NKLA', 'NOVA', 'OUST', 'PTRA', 'REE', 'RMO',
  'SHLS', 'SLDP', 'SPWR', 'STEM', 'VLD', 'XL', 'AEHR', 'AMPX',
  'AMPS', 'ARBE', 'ARVL', 'BEEM', 'CALX', 'DRIV', 'EOSE', 'FFIE',
  'FUV', 'LAZR', 'MULN', 'PLTK', 'PODD', 'PRCH', 'SLDP',
  // Fintech & Financial
  'MSTR', 'VIRT', 'ALLY', 'AX', 'BFAM', 'BL', 'BSIG', 'CACC',
  'CASH', 'CBSH', 'CFFN', 'COOP', 'CUBI', 'CWCO', 'CZFS', 'DCOM',
  'DFIN', 'DNLI', 'ENVA', 'ESNT', 'EQBK', 'FBIZ', 'FCBP', 'FCNCA',
  'FFIC', 'FISI', 'FMBH', 'FNLC', 'FRHC', 'FRME', 'FSBW', 'GBCI',
  'GNW', 'HFWA', 'HOPE', 'HTLF', 'IBTX', 'INBK', 'INDB', 'ITIC',
  'KREF', 'LADR', 'LC', 'LMND', 'LOAN', 'LPRO', 'LX', 'MCBS',
  'MKTW', 'ML', 'NBHC', 'NCR', 'NWBI', 'NYCB', 'OZK', 'PACW',
  'PATK', 'PFSI', 'PNFP', 'PRDO', 'PRSP', 'RKT', 'RILY', 'SBNY',
  'SIVB', 'SLQT', 'SNEX', 'SYF', 'TFSL', 'TREE', 'TRUP', 'UBSI',
  'UFPI', 'VBTX', 'VLY', 'VRTS', 'WABC', 'WAFD', 'WAL', 'WBS',
  'WRLD', 'WSBC', 'WTBA', 'WTFC', 'XNCR',
  // Media & Entertainment
  'PARA', 'BMBL', 'ATVI', 'CARG', 'CHDN', 'CNK', 'CPRI', 'CROX',
  'CWST', 'DXPE', 'EYE', 'FOSL', 'GIII', 'GRPN', 'HAFC', 'HLI',
  'IMAX', 'INSW', 'LAUR', 'LINC', 'LIND', 'LNW', 'LPTH', 'LSXMA',
  'LSXMK', 'MARA', 'NAVI', 'NXGN', 'OPRA', 'PENN', 'PLYA', 'PRGS',
  'QNST', 'RCII', 'RIOT', 'SIRI', 'SONO', 'SPHR', 'STAA', 'STRA',
  'STRR', 'TARS', 'TME', 'TRMK', 'TUYA', 'WMG', 'WWE', 'XMTR', 'ZUMZ',
  // Communications & Telecom
  'LUMN', 'FYBR', 'USM', 'SATS', 'GSAT', 'IRDM', 'ASTS', 'BAND',
  'BCOV', 'CALX', 'CASA', 'CCOI', 'CIEN', 'CIIG', 'CLFD', 'CNSL',
  'COMM', 'CRNT', 'CTL', 'DZSI', 'EXTR', 'GILT', 'GOGO', 'HLIT',
  'IDCC', 'INFN', 'INSG', 'LILA', 'LILAK', 'LTRX', 'LUMEN', 'MAXR',
  'MTCR', 'NTGR', 'OOMA', 'PDCO', 'RBBN', 'RDWR', 'SIFY', 'SPTN',
  'SWIR', 'TZOO', 'UBNT', 'UI', 'UTI', 'VSAT', 'WSTC', 'ZGID',
  // Industrial & Transportation
  'SAIA', 'LSTR', 'WERN', 'KNX', 'SNDR', 'AAWW', 'ABUS', 'ACHC',
  'ACLE', 'ACMR', 'AEIS', 'AGYS', 'AIMC', 'ALEX', 'ALGT',
  'AMRC', 'AMSC', 'AMWD', 'ANGI', 'ANIP', 'APEI', 'APOG', 'ARCB',
  'ARGO', 'AROC', 'ATEC', 'ATGE', 'ATLC', 'ATNI', 'AVAV',
  'AVID', 'AXGN', 'AY', 'AZPN', 'BANF', 'BCO', 'BECN', 'BJRI',
  'BKNG', 'BLD', 'BLDR', 'BLX', 'BMI', 'BRP', 'BRSP',
  'CALM', 'CASY', 'CBZ', 'CDNA', 'CFX', 'CGNX', 'CHCO', 'CHE',
  'CHTR', 'CIR', 'CLAR', 'CLBK', 'CMCO', 'CMT',
  'COHU', 'COLM', 'CPSI', 'CRAI', 'CRI', 'CSL', 'CSOD', 'CVCO',
  'CVLT', 'CYRX', 'DAN', 'DENN', 'DGII', 'DHC',
  'DLB', 'DNKN', 'DOOR', 'DY', 'ECHO', 'EEFT', 'EGBN',
  'EHTH', 'EIGI', 'ENSG', 'EQH', 'ESE', 'ESGR', 'ETON',
  'EVTV', 'EXLS', 'EXPO', 'FA', 'FARO', 'FCFS', 'FCN',
  'FHN', 'FIGS', 'FLGT', 'FLO', 'FLWS', 'FMAO', 'FN', 'FNKO',
  'FNV', 'FRO', 'FRPH', 'FTI',
  'FWRD', 'GBX', 'GDOT', 'GFF', 'GLBE', 'GLDD', 'GLNG',
  'GLOB', 'GLPI', 'GLW', 'GNTX', 'GO', 'GRBK', 'GRFS', 'GSHD',
  'GTBIF', 'GTX', 'GVA', 'HA', 'HBB', 'HBNC', 'HEES',
  'HGV', 'HLNE', 'HLX', 'HMN', 'HMST', 'HNI', 'HRMY', 'HSC',
  'HTLD', 'HUBG', 'HURN', 'HWC', 'HWKN', 'HZNP', 'IAA', 'IART',
  'ICAD', 'ICFI', 'ICUI', 'IDYA', 'IEP', 'IGT', 'IIIN', 'IIIV',
  'IMXI', 'INGN', 'INMD', 'INST', 'INT', 'IOSP', 'IPAR', 'IRBT',
  'ISBC', 'ISSC', 'ITRI', 'IVA', 'JBSS', 'JBTX', 'JBT', 'JCOM',
  'JJSF', 'JKHY', 'JNPR', 'JOE', 'JRVR', 'JTPY', 'KALU',
  'KAMN', 'KBAL', 'KELYA', 'KEQU', 'KFRC', 'KIDS', 'KLXE', 'KMDA',
  'KODK', 'KTOS', 'LAMR', 'LAWS', 'LBC', 'LDI',
  'LFST', 'LGIH', 'LIVN', 'LKFN', 'LLNW', 'LMAT', 'LNDC',
  'LNTH', 'LOB', 'LOGI', 'LQDA', 'LUNA',
  'LXRX', 'MATW', 'MAXN', 'MBUU', 'MBWM', 'MCRI',
  'MDRX', 'MEDS', 'MESA', 'MGEE', 'MGPI', 'MGRC', 'MIDD',
  'MLCO', 'MMSI', 'MNTV', 'MOD', 'MODV', 'MOGO', 'MORF', 'MORN',
  'MRCY', 'MRSN', 'MRUS', 'MSEX', 'MSGS', 'MTLS', 'MTX',
  'NARI', 'NATR', 'NBEV', 'NBTB', 'NCMI', 'NEO',
  'NEOG', 'NGVC', 'NINE', 'NMIH', 'NMRK', 'NNBR', 'NOVN', 'NPTN',
  'NRDS', 'NSIT', 'NSTG', 'NTCT', 'NTRA', 'NUVA', 'NVCR', 'NVT',
  'NVTR', 'NWPX', 'NX', 'OABI', 'OAS',
  'OCFC', 'OCGN', 'ODP', 'OFIX', 'OFLX', 'OGS', 'OMCL', 'OMER',
  'ONB', 'OPCH', 'OPI', 'ORBC', 'ORIC', 'OSG', 'OSUR', 'OTTR',
  'ATRO', 'OVBC', 'OVID', 'PACB', 'PAGS', 'PATI', 'PAYA',
  'PAYS', 'PBCT', 'PBH', 'PBYI', 'PCTY', 'PDCE', 'PDFS',
  'PETQ', 'PFGC', 'PGEN', 'PGNY', 'PINC', 'PKE',
  'PLAY', 'PLBY', 'PLCE', 'PLUS', 'PMVP', 'PNRG', 'PNTG',
  'PPBI', 'PPC', 'PRAA', 'PRMW', 'PROS',
  'PRSC', 'PRVB', 'PSFE', 'PSMT', 'PSN', 'PSTL', 'PTGX', 'PUBM',
  'PXLW', 'QDEL', 'QRTEA', 'QTRX', 'QTWO', 'QUIK', 'RAMP',
  'RAPT', 'RDNT', 'RDUS', 'RDVT',
  'REGI', 'RELL', 'REPH', 'REPL', 'RETO', 'REVG', 'RGC',
  'RGLD', 'RICK', 'RIGL', 'RIVE', 'RNET', 'RNR', 'ROCC',
  'ROCK', 'ROG', 'ROLL', 'RPAY', 'RPRX', 'RRX', 'RSSS', 'RTLR',
  'RTRX', 'RUBY', 'RUSHA', 'RUSHB', 'RUTH', 'RVMD', 'RVPH',
  'RYAM', 'SAIL', 'SAM', 'SANA', 'SANM', 'SBCF', 'SBFG', 'SBGI',
  'SBRA', 'SCHL', 'SCHN', 'SCOR', 'SCSC', 'SCWX', 'SDGR', 'SEAT',
  'SENEA', 'SFBS', 'SFNC', 'SGMO', 'SGMS', 'SHBI', 'SHEN', 'SHIP',
  'SHOO', 'SHV', 'SIBN', 'SIG', 'SILC', 'SILK', 'SIM',
  'SITC', 'SJW', 'SKIN', 'SKWD', 'SLDB',
  'SLP', 'SMBC', 'SMID', 'SMMT', 'SMPL', 'SMSI', 'SMTX',
  'SNCR', 'SNDX', 'SNV', 'SNWV', 'SONM', 'SP', 'SPCB', 'SPFI',
  'SPNE', 'SPNT', 'SPOK', 'SPRO', 'SPWH',
  'SPXC', 'SRCE', 'SRDX', 'SREV', 'SRNE', 'SSB', 'SSRM', 'SSTI',
  'SSTK', 'STAG', 'STBA', 'STFC', 'STLD', 'STMP', 'STNG', 'STOK',
  'STRL', 'STRS', 'STXS', 'SUPN', 'SUSC', 'SVRA', 'SWAV',
  'SWTX', 'SYBX', 'SYBT', 'SYNC', 'SYNH', 'SYNL',
  'TBBK', 'TBI', 'TCBI', 'TCBK', 'TCMD', 'TELL',
  'TEN', 'TERN', 'TESS', 'TFII', 'TGNA', 'TH', 'THRY',
  'TILE', 'TITN', 'TLND', 'TLYS', 'TMDX', 'TNAV', 'TNDM',
  'TNXP', 'TOPS', 'TPHS', 'TPTX', 'TR', 'TRDA', 'TRIB', 'TRHC',
  'TRM', 'TRNO', 'TRS', 'TRUE', 'TRVN',
  'TTGT', 'TTM', 'TWNK', 'TXG', 'TXMD', 'UCBI',
  'UEIC', 'UFCS', 'UFPT', 'UG', 'UHAL', 'UHT',
  'UIHC', 'ULH', 'UMBF', 'UNIT', 'UNTY', 'UPLD', 'URGN',
  'USAK', 'USAP', 'USAU', 'USCR', 'USIO', 'USNA', 'USPH', 'UTMD',
  'VBF', 'VCRA', 'VEON', 'VERA', 'VERI', 'VERU',
  'VICR', 'VIE', 'VIEW', 'VINC', 'VIRC', 'VIRI',
  'VIS', 'VITL', 'VIVO', 'VLDR', 'VMEO', 'VNCE',
  'VNDA', 'VNE', 'VNET', 'VOXX', 'VOYA', 'VRA', 'VRRM',
  'VSEC', 'VSTM', 'VTS', 'VTVT',
  'WASH', 'WATT', 'WDAY', 'WDFC',
  'WETF', 'WEYS', 'WHF', 'WKSP', 'WLDN', 'WLK',
  'WMK', 'WNEB', 'WOR', 'WPRT', 'WRBY',
  'WSBF', 'WSC', 'WSTG', 'WTRG', 'WVVI', 'WWD', 'WWW',
  'XBIT', 'XELA', 'XNET', 'XOG',
  'XOMA', 'XONE', 'XPEL', 'XPER', 'YGTY', 'YMAB', 'YORW',
  'YRCW', 'YSG', 'YY', 'ZBRA', 'ZEAL', 'ZEUS', 'ZIMV', 'ZION',
  'ZIXI', 'ZNTL', 'ZTO', 'ZVO',
  // Real Estate & REITs
  'REXR', 'COLD', 'IIPR', 'ADC', 'AHH', 'AIRC', 'APLE',
  'BDN', 'BNL', 'BRX', 'BXP', 'CIO', 'CLPR', 'CMCT', 'CTRE',
  'CUBE', 'CUZ', 'DEA', 'DEI', 'DGRW', 'DOC', 'EGP',
  'ELME', 'EPR', 'ESRT', 'FAT', 'FCPT', 'FPI', 'FR', 'FSP',
  'GNL', 'GOOD', 'GPMT', 'GTY', 'HT', 'ILPT', 'INN', 'IRT',
  'JBGS', 'KRC', 'LAND', 'LTC', 'MAC', 'MDRR', 'MFA',
  'MGP', 'MPW', 'NHI', 'NNN', 'NSA', 'NXRT', 'NYT', 'OFC',
  'OFFS', 'OHI', 'OUT', 'PGRE', 'PK', 'PLYM', 'QTS',
  'RC', 'RLGT', 'RLJ', 'RYN', 'SAFE', 'SKT', 'SLG',
  'SNDE', 'SRC', 'STAR', 'STOR', 'SUI', 'SVC',
  'TRTX', 'UBFO', 'UBA', 'UE', 'VER', 'VNO',
  'VRE', 'VSTA', 'WPC', 'WRI', 'WTRE', 'XHR',
  // Additional growth stocks from old list
  'QUBT', 'RKLB', 'LUNR', 'MNTS', 'SPCE', 'JOBY', 'ACHR', 'CEVA',
  'VEEV', 'FIVN', 'OPEN', 'RDFN', 'Z', 'ZG', 'CELH',
];

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const KEYS = {
  PORTFOLIO: 'tradingbot:portfolio',
  TRADES: 'tradingbot:trades',
  SIGNALS: 'tradingbot:signals',
  LAST_RUN: 'tradingbot:lastRun',
  HISTORY: 'tradingbot:history',
  SPY_BENCHMARK: 'tradingbot:spyBenchmark',
};

// Storage functions
async function getPortfolio() {
  const data = await redis.get(KEYS.PORTFOLIO);
  return data || {
    cash: DEFAULT_CONFIG.initialCapital,
    holdings: [],
    totalValue: DEFAULT_CONFIG.initialCapital,
    lastUpdated: new Date().toISOString(),
    initialCapital: DEFAULT_CONFIG.initialCapital,
  };
}

async function savePortfolio(portfolio) {
  await redis.set(KEYS.PORTFOLIO, portfolio);
}

async function getTrades() {
  const data = await redis.get(KEYS.TRADES);
  return data || [];
}

async function addTrade(trade) {
  const trades = await getTrades();
  trades.unshift(trade);
  await redis.set(KEYS.TRADES, trades.slice(0, 100));
}

async function saveSignals(signals) {
  await redis.set(KEYS.SIGNALS, signals);
}

async function setLastRun(timestamp) {
  await redis.set(KEYS.LAST_RUN, timestamp);
}

async function getPortfolioHistory() {
  const data = await redis.get(KEYS.HISTORY);
  return data || [];
}

async function addPortfolioSnapshot(snapshot) {
  const history = await getPortfolioHistory();
  history.push(snapshot);
  await redis.set(KEYS.HISTORY, history.slice(-1000));
}

// S&P 500 Benchmark caching (runs from LXC to avoid Vercel IP blocks)
async function updateSPYBenchmark() {
  try {
    // Always fetch at least 90 days to ensure we have enough data points
    const minStartDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const history = await getPortfolioHistory();
    const historyStart = history.length > 0 ? new Date(history[0].timestamp) : minStartDate;
    const startDate = historyStart < minStartDate ? historyStart : minStartDate;

    const start = Math.floor(startDate.getTime() / 1000);
    const end = Math.floor(Date.now() / 1000);

    // Use hourly data for intraday chart visibility (supports up to 730 days)
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?period1=${start}&period2=${end}&interval=1h`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`S&P 500 benchmark fetch failed: ${response.status}`);
      return;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
      console.log('Invalid S&P 500 response structure');
      return;
    }

    const timestamps = result.timestamp;
    const closes = result.indicators.quote[0].close;
    const firstValidClose = closes.find(c => c !== null) || closes[0];

    // Normalize to $10,000 starting value to match portfolio initial capital
    const benchmark = timestamps
      .map((ts, i) => ({
        timestamp: new Date(ts * 1000).toISOString(),
        value: closes[i] !== null ? (closes[i] / firstValidClose) * DEFAULT_CONFIG.initialCapital : null,
      }))
      .filter(p => p.value !== null);

    if (benchmark.length > 0) {
      await redis.set(KEYS.SPY_BENCHMARK, benchmark);
      console.log(`S&P 500 benchmark cached: ${benchmark.length} data points`);
    } else {
      console.log('S&P 500 benchmark: no valid data points');
    }
  } catch (error) {
    console.log(`S&P 500 benchmark error: ${error.message}`);
  }
}

// Yahoo Finance API functions
async function fetchYahooQuote(symbol) {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d&includePrePost=true`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.meta) return null;

    const meta = result.meta;
    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp;

    let price = meta.regularMarketPrice;
    let isExtendedHours = false;

    if (quotes?.close && timestamps?.length > 0) {
      for (let i = quotes.close.length - 1; i >= 0; i--) {
        if (quotes.close[i] !== null) {
          price = quotes.close[i];
          const lastTimestamp = timestamps[i];
          const tradingPeriod = meta.currentTradingPeriod;
          const isPreMarket = tradingPeriod?.pre && lastTimestamp >= tradingPeriod.pre.start && lastTimestamp < tradingPeriod.pre.end;
          const isPostMarket = tradingPeriod?.post && lastTimestamp >= tradingPeriod.post.start && lastTimestamp < tradingPeriod.post.end;
          isExtendedHours = isPreMarket || isPostMarket;
          break;
        }
      }
    }

    if (!price) return null;
    return {
      price,
      isExtendedHours,
      dividendYield: meta.dividendYield || undefined,
      annualDividend: meta.trailingAnnualDividendRate || undefined,
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error.message);
    return null;
  }
}

// Yahoo Finance Intraday + Daily Bar Fetching (for forex/futures not supported by Alpaca)

const YAHOO_BATCH_SIZE = 5; // Yahoo requires individual requests per symbol
const YAHOO_BATCH_DELAY_MS = 400; // Delay between requests to avoid rate limiting

async function fetchYahooIntradayBars(symbols) {
  // Fetch 5-min intraday bars from Yahoo Finance for multiple symbols
  const allBars = {};

  for (let i = 0; i < symbols.length; i += YAHOO_BATCH_SIZE) {
    const batch = symbols.slice(i, i + YAHOO_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=5d&includePrePost=true`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
          );
          if (!response.ok) return { symbol, bars: [] };

          const data = await response.json();
          const result = data?.chart?.result?.[0];
          if (!result?.timestamp || !result?.indicators?.quote?.[0]) return { symbol, bars: [] };

          const { timestamp, indicators } = result;
          const quote = indicators.quote[0];

          const bars = timestamp
            .map((ts, idx) => ({
              date: new Date(ts * 1000).toISOString(),
              open: quote.open[idx],
              high: quote.high[idx],
              low: quote.low[idx],
              close: quote.close[idx],
              volume: quote.volume?.[idx] || 0,
            }))
            .filter(b => b.open !== null && b.high !== null && b.low !== null && b.close !== null);

          return { symbol, bars };
        } catch (error) {
          console.error(`Yahoo intraday error (${symbol}):`, error.message);
          return { symbol, bars: [] };
        }
      })
    );

    for (const { symbol, bars } of batchResults) {
      if (bars.length > 0) {
        allBars[symbol] = bars;
      }
    }

    if (i + YAHOO_BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, YAHOO_BATCH_DELAY_MS));
    }
  }

  return allBars;
}

async function fetchYahooDailyBars(symbols) {
  // Fetch 3-month daily bars from Yahoo Finance for multiple symbols
  const allBars = {};

  for (let i = 0; i < symbols.length; i += YAHOO_BATCH_SIZE) {
    const batch = symbols.slice(i, i + YAHOO_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=3mo&interval=1d`,
            { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
          );
          if (!response.ok) return { symbol, bars: [] };

          const data = await response.json();
          const result = data?.chart?.result?.[0];
          if (!result?.timestamp || !result?.indicators?.quote?.[0]) return { symbol, bars: [] };

          const { timestamp, indicators } = result;
          const quote = indicators.quote[0];

          const bars = timestamp
            .map((ts, idx) => ({
              date: new Date(ts * 1000).toISOString().split('T')[0],
              open: quote.open[idx],
              high: quote.high[idx],
              low: quote.low[idx],
              close: quote.close[idx],
              volume: quote.volume?.[idx] || 0,
            }))
            .filter(b => b.open !== null && b.high !== null && b.low !== null && b.close !== null);

          return { symbol, bars };
        } catch (error) {
          console.error(`Yahoo daily error (${symbol}):`, error.message);
          return { symbol, bars: [] };
        }
      })
    );

    for (const { symbol, bars } of batchResults) {
      if (bars.length > 0) {
        allBars[symbol] = bars;
      }
    }

    if (i + YAHOO_BATCH_SIZE < symbols.length) {
      await new Promise(r => setTimeout(r, YAHOO_BATCH_DELAY_MS));
    }
  }

  return allBars;
}

// Alpaca Data Fetching — batch multi-symbol requests

function toAlpacaCryptoSymbol(symbol) {
  // BTC-USD → BTC/USD
  return symbol.replace('-', '/');
}

function fromAlpacaCryptoSymbol(symbol) {
  // BTC/USD → BTC-USD
  return symbol.replace('/', '-');
}

function toAlpacaStockSymbol(symbol) {
  // BRK-B → BRK.B (Alpaca uses dots for share classes)
  return symbol.replace('-', '.');
}

function fromAlpacaStockSymbol(symbol) {
  // BRK.B → BRK-B (our codebase uses Yahoo-style hyphens)
  return symbol.replace('.', '-');
}

function isCryptoSymbol(symbol) {
  return symbol.endsWith('-USD') && CRYPTO_SYMBOLS.includes(symbol);
}

function isForexOrFutures(symbol) {
  return symbol.endsWith('=X') || symbol.endsWith('=F');
}

function parseAlpacaBars(bars) {
  return bars.map(b => ({
    date: b.t,
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v,
    vwap: b.vw,
  }));
}

async function fetchAlpacaBars(symbols, timeframe, days, isCrypto = false) {
  // Batch fetch bars from Alpaca (up to 50 symbols per request)
  const allBars = {};
  const alpacaSymbols = isCrypto ? symbols.map(toAlpacaCryptoSymbol) : symbols.map(toAlpacaStockSymbol);
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const endpoint = isCrypto
    ? `${ALPACA_DATA_URL}/v1beta3/crypto/us/bars`
    : `${ALPACA_DATA_URL}/v2/stocks/bars`;

  for (let i = 0; i < alpacaSymbols.length; i += BATCH_SIZE) {
    const batch = alpacaSymbols.slice(i, i + BATCH_SIZE);
    const symbolsParam = batch.join(',');

    try {
      let pageToken = null;
      const symbolBars = {};
      batch.forEach(s => { symbolBars[s] = []; });

      do {
        const url = new URL(endpoint);
        url.searchParams.set('symbols', symbolsParam);
        url.searchParams.set('timeframe', timeframe);
        url.searchParams.set('start', start);
        url.searchParams.set('limit', '10000');
        if (pageToken) url.searchParams.set('page_token', pageToken);

        let response;
        let retries = 0;
        const maxRetries = 3;
        while (retries <= maxRetries) {
          response = await fetch(url.toString(), {
            headers: {
              'APCA-API-KEY-ID': ALPACA_API_KEY,
              'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
            },
          });
          if (response.status === 429 && retries < maxRetries) {
            const backoff = Math.pow(2, retries + 1) * 1000; // 2s, 4s, 8s
            console.log(`Rate limited, waiting ${backoff / 1000}s before retry...`);
            await new Promise(r => setTimeout(r, backoff));
            retries++;
          } else {
            break;
          }
        }

        if (!response.ok) {
          console.error(`Alpaca bars fetch failed (${response.status}): ${await response.text()}`);
          break;
        }

        const data = await response.json();
        const bars = data.bars || {};

        for (const [sym, barList] of Object.entries(bars)) {
          if (!symbolBars[sym]) symbolBars[sym] = [];
          symbolBars[sym].push(...barList);
        }

        pageToken = data.next_page_token || null;
      } while (pageToken);

      // Convert to our format and map back to original symbol names
      for (const [alpacaSym, bars] of Object.entries(symbolBars)) {
        const originalSym = isCrypto ? fromAlpacaCryptoSymbol(alpacaSym) : fromAlpacaStockSymbol(alpacaSym);
        if (bars.length > 0) {
          allBars[originalSym] = parseAlpacaBars(bars);
        }
      }
    } catch (error) {
      console.error(`Alpaca batch fetch error:`, error.message);
    }

    if (i + BATCH_SIZE < alpacaSymbols.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return allBars;
}

async function fetchAllMarketData(symbols) {
  // Separate symbols by type
  const stockSymbols = symbols.filter(s => !isCryptoSymbol(s) && !isForexOrFutures(s));
  const cryptoSymbols = symbols.filter(s => isCryptoSymbol(s));
  const forexFuturesSymbols = symbols.filter(s => isForexOrFutures(s));

  console.log(`Fetching data: ${stockSymbols.length} stocks (Alpaca), ${cryptoSymbols.length} crypto (Alpaca), ${forexFuturesSymbols.length} forex/futures (Yahoo)`);

  // Fetch Alpaca data sequentially to avoid 429 rate limits (free tier: 200 req/min)
  const stockIntraday = stockSymbols.length > 0 ? await fetchAlpacaBars(stockSymbols, '5Min', 5, false) : {};
  const stockDaily = stockSymbols.length > 0 ? await fetchAlpacaBars(stockSymbols, '1Day', 120, false) : {};
  const cryptoIntraday = cryptoSymbols.length > 0 ? await fetchAlpacaBars(cryptoSymbols, '5Min', 5, true) : {};
  const cryptoDaily = cryptoSymbols.length > 0 ? await fetchAlpacaBars(cryptoSymbols, '1Day', 120, true) : {};

  // Fetch Yahoo Finance data for forex/futures (not supported by Alpaca)
  const fxFuturesIntraday = forexFuturesSymbols.length > 0 ? await fetchYahooIntradayBars(forexFuturesSymbols) : {};
  const fxFuturesDaily = forexFuturesSymbols.length > 0 ? await fetchYahooDailyBars(forexFuturesSymbols) : {};

  console.log(`Yahoo data received: ${Object.keys(fxFuturesIntraday).length} intraday, ${Object.keys(fxFuturesDaily).length} daily`);

  return {
    intraday: { ...stockIntraday, ...cryptoIntraday, ...fxFuturesIntraday },
    daily: { ...stockDaily, ...cryptoDaily, ...fxFuturesDaily },
  };
}

// Alpaca Paper Trading — submit orders to mirror simulated trades
function toAlpacaOrderSymbol(symbol) {
  if (isCryptoSymbol(symbol)) return toAlpacaCryptoSymbol(symbol); // BTC-USD → BTC/USD
  return toAlpacaStockSymbol(symbol); // BRK-B → BRK.B
}

// Track Alpaca paper positions so we don't try to sell what we don't hold
let alpacaPositions = new Set();

async function syncAlpacaPositions() {
  try {
    const response = await fetch(`${ALPACA_PAPER_URL}/v2/positions`, {
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
      },
    });
    if (!response.ok) {
      console.log(`Alpaca positions fetch failed: ${response.status}`);
      return;
    }
    const positions = await response.json();
    alpacaPositions = new Set(positions.map(p => {
      // Convert Alpaca symbols back to our format
      if (p.asset_class === 'crypto') return fromAlpacaCryptoSymbol(p.symbol);
      return fromAlpacaStockSymbol(p.symbol);
    }));
    console.log(`Alpaca paper positions synced: ${alpacaPositions.size} holdings`);
  } catch (error) {
    console.log(`Alpaca positions sync error: ${error.message}`);
  }
}

async function submitAlpacaOrder(symbol, qty, side) {
  // Forex/futures not supported by Alpaca — skip paper order (still tracked in Redis)
  if (isForexOrFutures(symbol)) return null;
  // Don't sell what we don't hold on Alpaca (avoids short sell errors)
  if (side === 'sell' && !alpacaPositions.has(symbol)) return null;

  try {
    const alpacaSymbol = toAlpacaOrderSymbol(symbol);
    const isCrypto = isCryptoSymbol(symbol);
    const response = await fetch(`${ALPACA_PAPER_URL}/v2/orders`, {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': ALPACA_API_KEY,
        'APCA-API-SECRET-KEY': ALPACA_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: alpacaSymbol,
        qty: qty.toFixed(4),
        side,
        type: 'market',
        time_in_force: isCrypto ? 'gtc' : 'day',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  Alpaca paper ${side} failed (${symbol}): ${errorText}`);
      return null;
    }

    const order = await response.json();
    console.log(`  Alpaca paper ${side.toUpperCase()} ${qty.toFixed(4)} ${symbol} → ${order.status}`);

    // Update local position tracking
    if (side === 'buy') alpacaPositions.add(symbol);
    if (side === 'sell') alpacaPositions.delete(symbol);

    return order;
  } catch (error) {
    console.log(`  Alpaca order error (${symbol}): ${error.message}`);
    return null;
  }
}

function isOnCooldown(symbol) {
  const lastTrade = tradeCooldowns.get(symbol);
  if (!lastTrade) return false;
  return Date.now() - lastTrade < TRADE_COOLDOWN_MS;
}

function setCooldown(symbol) {
  tradeCooldowns.set(symbol, Date.now());
}

// ═══════════════════════════════════════════════════════════
// Phase 1: Shared Indicator Utilities
// ═══════════════════════════════════════════════════════════

function computeSMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function computeEMA(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }
  return ema;
}

function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  const recent = changes.slice(-period);
  const gains = recent.filter(c => c > 0);
  const losses = recent.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

function computeMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod + signalPeriod) return null;
  // Build full MACD line to derive signal line
  const macdLine = [];
  const kFast = 2 / (fastPeriod + 1);
  const kSlow = 2 / (slowPeriod + 1);
  let emaFast = prices.slice(0, fastPeriod).reduce((a, b) => a + b, 0) / fastPeriod;
  let emaSlow = prices.slice(0, slowPeriod).reduce((a, b) => a + b, 0) / slowPeriod;
  for (let i = 1; i < prices.length; i++) {
    if (i >= fastPeriod) emaFast = prices[i] * kFast + emaFast * (1 - kFast);
    if (i >= slowPeriod) emaSlow = prices[i] * kSlow + emaSlow * (1 - kSlow);
    if (i >= slowPeriod) macdLine.push(emaFast - emaSlow);
  }
  if (macdLine.length < signalPeriod) return null;
  const kSig = 2 / (signalPeriod + 1);
  let signal = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
  for (let i = signalPeriod; i < macdLine.length; i++) {
    signal = macdLine[i] * kSig + signal * (1 - kSig);
  }
  const macd = macdLine[macdLine.length - 1];
  const histogram = macd - signal;
  // Previous histogram for slope detection
  let prevHistogram = null;
  if (macdLine.length >= 2) {
    const kSig2 = kSig;
    let sig2 = macdLine.slice(0, signalPeriod).reduce((a, b) => a + b, 0) / signalPeriod;
    for (let i = signalPeriod; i < macdLine.length - 1; i++) {
      sig2 = macdLine[i] * kSig2 + sig2 * (1 - kSig2);
    }
    prevHistogram = macdLine[macdLine.length - 2] - sig2;
  }
  return { macd, signal, histogram, prevHistogram };
}

function computeBollingerBands(prices, period = 20, mult = 2) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return { upper: mean + mult * stdDev, middle: mean, lower: mean - mult * stdDev, stdDev, width: (2 * mult * stdDev) / mean };
}

function computeATR(highs, lows, closes, period = 14) {
  if (highs.length < period + 1) return null;
  let atrSum = 0;
  const start = Math.max(1, highs.length - period);
  for (let i = start; i < highs.length; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    atrSum += tr;
  }
  return atrSum / Math.min(period, highs.length - 1);
}

function computeADX(highs, lows, closes, period = 14) {
  // Average Directional Index — measures trend strength (0-100)
  if (highs.length < period * 2 + 1) return null;
  const plusDM = [], minusDM = [], tr = [];
  for (let i = 1; i < highs.length; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  // Smoothed averages using Wilder's method
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0);
  const dx = [];
  for (let i = period; i < plusDM.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i];
    smoothTR = smoothTR - smoothTR / period + tr[i];
    const plusDI = smoothTR > 0 ? (smoothPlusDM / smoothTR) * 100 : 0;
    const minusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    dx.push(diSum > 0 ? (Math.abs(plusDI - minusDI) / diSum) * 100 : 0);
  }
  if (dx.length < period) return null;
  let adx = dx.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dx.length; i++) {
    adx = (adx * (period - 1) + dx[i]) / period;
  }
  return adx;
}

function computeROC(prices, period) {
  if (prices.length <= period) return null;
  const current = prices[prices.length - 1];
  const past = prices[prices.length - 1 - period];
  return past !== 0 ? ((current - past) / past) * 100 : 0;
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Market Regime Detection
// ═══════════════════════════════════════════════════════════

function detectRegime(dailyCloses, dailyHighs, dailyLows) {
  if (dailyCloses.length < 60) return 'UNKNOWN';
  const adx = computeADX(dailyHighs, dailyLows, dailyCloses, 14);
  if (adx === null) return 'UNKNOWN';
  const sma20 = computeSMA(dailyCloses, 20);
  const sma50 = computeSMA(dailyCloses, 50);
  if (sma20 === null || sma50 === null) return 'UNKNOWN';
  if (adx > 25) return sma20 > sma50 ? 'TRENDING_UP' : 'TRENDING_DOWN';
  return 'RANGE_BOUND';
}

// ═══════════════════════════════════════════════════════════
// Phase 3: Strategy Functions
// ═══════════════════════════════════════════════════════════

// Group A — Trend-Following

function trendMomentumStrategy(dailyCloses, intradayCloses) {
  // Multi-timeframe momentum: SMA alignment + ROC + breakout
  if (dailyCloses.length < 50 || intradayCloses.length < 20) {
    return { name: 'Trend Momentum', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  let score = 0;
  const reasons = [];

  const sma10 = computeSMA(dailyCloses, 10);
  const sma20 = computeSMA(dailyCloses, 20);
  const sma50 = computeSMA(dailyCloses, 50);
  const price = dailyCloses[dailyCloses.length - 1];

  // SMA alignment: 10 > 20 > 50 = full uptrend
  if (sma10 > sma20 && sma20 > sma50) { score += 0.4; reasons.push('SMA aligned up'); }
  else if (sma10 < sma20 && sma20 < sma50) { score -= 0.4; reasons.push('SMA aligned down'); }
  else if (sma10 > sma20) { score += 0.15; reasons.push('Short-term up'); }
  else if (sma10 < sma20) { score -= 0.15; reasons.push('Short-term down'); }

  // Rate of change (20-day)
  const roc20 = computeROC(dailyCloses, 20);
  if (roc20 !== null) {
    if (roc20 > 10) { score += 0.3; reasons.push(`ROC20 strong +${roc20.toFixed(1)}%`); }
    else if (roc20 > 3) { score += 0.15; reasons.push(`ROC20 +${roc20.toFixed(1)}%`); }
    else if (roc20 < -10) { score -= 0.3; reasons.push(`ROC20 ${roc20.toFixed(1)}%`); }
    else if (roc20 < -3) { score -= 0.15; reasons.push(`ROC20 ${roc20.toFixed(1)}%`); }
  }

  // 50-day breakout
  const high50 = Math.max(...dailyCloses.slice(-50));
  const low50 = Math.min(...dailyCloses.slice(-50));
  if (price >= high50 * 0.98) { score += 0.2; reasons.push('Near 50d high'); }
  else if (price <= low50 * 1.02) { score -= 0.2; reasons.push('Near 50d low'); }

  // SMA slope (20-day) — is the trend accelerating?
  if (dailyCloses.length >= 25) {
    const sma20_5ago = computeSMA(dailyCloses.slice(0, -5), 20);
    if (sma20_5ago !== null && sma20 > sma20_5ago) { score += 0.1; reasons.push('SMA20 rising'); }
    else if (sma20_5ago !== null && sma20 < sma20_5ago) { score -= 0.1; reasons.push('SMA20 falling'); }
  }

  return {
    name: 'Trend Momentum',
    score: Math.max(-1, Math.min(1, score)),
    confidence: 0.7,
    reason: reasons.join(', '),
  };
}

function macdTrendStrategy(intradayCloses) {
  // MACD trend confirmation on intraday data
  if (intradayCloses.length < 40) {
    return { name: 'MACD Trend', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  const macd = computeMACD(intradayCloses);
  if (!macd) return { name: 'MACD Trend', score: 0, confidence: 0, reason: 'Cannot compute MACD' };

  let score = 0;
  const reasons = [];

  // Histogram direction (positive = bullish momentum)
  if (macd.histogram > 0) { score += 0.3; reasons.push(`Hist +${macd.histogram.toFixed(3)}`); }
  else { score -= 0.3; reasons.push(`Hist ${macd.histogram.toFixed(3)}`); }

  // Histogram slope (acceleration)
  if (macd.prevHistogram !== null) {
    const slope = macd.histogram - macd.prevHistogram;
    if (slope > 0 && macd.histogram > 0) { score += 0.25; reasons.push('Accelerating up'); }
    else if (slope < 0 && macd.histogram < 0) { score -= 0.25; reasons.push('Accelerating down'); }
    else if (slope > 0 && macd.histogram < 0) { score += 0.15; reasons.push('Bearish decelerating'); }
    else if (slope < 0 && macd.histogram > 0) { score -= 0.15; reasons.push('Bullish decelerating'); }
  }

  // MACD vs signal line crossover
  if (macd.macd > macd.signal) { score += 0.2; reasons.push('MACD above signal'); }
  else { score -= 0.2; reasons.push('MACD below signal'); }

  return {
    name: 'MACD Trend',
    score: Math.max(-1, Math.min(1, score)),
    confidence: 0.6,
    reason: reasons.join(', '),
  };
}

// Group B — Mean-Reversion

function bollingerRSIReversionStrategy(intradayCloses) {
  // Bollinger Band + RSI-14 mean reversion with bandwidth filter
  if (intradayCloses.length < 25) {
    return { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'Insufficient data' };
  }

  const bb = computeBollingerBands(intradayCloses, 20, 2);
  const rsi = computeRSI(intradayCloses, 14);
  if (!bb) return { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'Cannot compute BB' };

  const price = intradayCloses[intradayCloses.length - 1];
  let score = 0;
  const reasons = [];

  // Bandwidth filter: skip if bands are too narrow (no mean to revert to)
  if (bb.width < 0.01) {
    return { name: 'BB+RSI Reversion', score: 0, confidence: 0.3, reason: 'BB too narrow — no reversion edge' };
  }

  // Price relative to bands
  if (price < bb.lower) {
    score += 0.5;
    reasons.push('Below lower BB');
    if (rsi < 30) { score += 0.3; reasons.push(`RSI oversold (${rsi.toFixed(0)})`); }
    else if (rsi < 40) { score += 0.15; reasons.push(`RSI low (${rsi.toFixed(0)})`); }
  } else if (price > bb.upper) {
    score -= 0.5;
    reasons.push('Above upper BB');
    if (rsi > 70) { score -= 0.3; reasons.push(`RSI overbought (${rsi.toFixed(0)})`); }
    else if (rsi > 60) { score -= 0.15; reasons.push(`RSI high (${rsi.toFixed(0)})`); }
  } else {
    // Inside bands — weaker signal
    const position = (price - bb.lower) / (bb.upper - bb.lower);
    if (position < 0.2) { score += 0.2; reasons.push('Near lower BB'); }
    else if (position > 0.8) { score -= 0.2; reasons.push('Near upper BB'); }
    else { reasons.push('Mid-band'); }
  }

  return {
    name: 'BB+RSI Reversion',
    score: Math.max(-1, Math.min(1, score)),
    confidence: 0.7,
    reason: reasons.join(', '),
  };
}

function vwapReversionStrategy(intradayBars) {
  // VWAP Reversion: mean reversion to volume-weighted average price (kept from original)
  if (!intradayBars || intradayBars.length < 12) {
    return { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'Insufficient intraday data' };
  }

  // Use most recent session bars (up to 78 bars ≈ 6.5 hours)
  const barsToUse = intradayBars.slice(-78);

  // Compute cumulative VWAP from typical price × volume
  let cumVolPrice = 0;
  let cumVol = 0;
  for (const bar of barsToUse) {
    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    cumVolPrice += typicalPrice * bar.volume;
    cumVol += bar.volume;
  }

  if (cumVol === 0) {
    return { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'No volume data' };
  }

  const vwap = cumVolPrice / cumVol;
  const currentPrice = barsToUse[barsToUse.length - 1].close;

  const squaredDiffs = barsToUse.map(b => {
    const tp = (b.high + b.low + b.close) / 3;
    return Math.pow(tp - vwap, 2);
  });
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { name: 'VWAP Reversion', score: 0, confidence: 0.3, reason: 'No price variation' };
  }

  const zScore = (currentPrice - vwap) / stdDev;
  let score = 0;
  let reason = '';

  if (zScore < -2) { score = 0.8; reason = `Deeply below VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore < -1.5) { score = 0.6; reason = `Well below VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore < -1) { score = 0.4; reason = `Below VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore < -0.5) { score = 0.2; reason = `Slightly below VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore > 2) { score = -0.8; reason = `Deeply above VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore > 1.5) { score = -0.6; reason = `Well above VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore > 1) { score = -0.4; reason = `Above VWAP (z=${zScore.toFixed(2)})`; }
  else if (zScore > 0.5) { score = -0.2; reason = `Slightly above VWAP (z=${zScore.toFixed(2)})`; }
  else { score = 0; reason = `At VWAP (z=${zScore.toFixed(2)})`; }

  const confidence = Math.min(0.8, 0.3 + (barsToUse.length / 78) * 0.5);
  return { name: 'VWAP Reversion', score, confidence, reason };
}

// ═══════════════════════════════════════════════════════════
// Phase 4: Regime-Weighted Signal Combination
// ═══════════════════════════════════════════════════════════

function weightedAvg(signals) {
  let totalWeight = 0;
  let totalScore = 0;
  for (const s of signals) {
    if (s.confidence > 0) {
      totalScore += s.score * s.confidence;
      totalWeight += s.confidence;
    }
  }
  return totalWeight > 0 ? totalScore / totalWeight : 0;
}

function combineSignals(symbol, trendSignals, reversionSignals, regime) {
  const weights = REGIME_WEIGHTS[regime] || REGIME_WEIGHTS.UNKNOWN;
  const trendScore = weightedAvg(trendSignals);
  const reversionScore = weightedAvg(reversionSignals);
  const combined = trendScore * weights.trend + reversionScore * weights.reversion;

  let recommendation;
  if (combined > 0.55) recommendation = 'STRONG_BUY';
  else if (combined > 0.35) recommendation = 'BUY';
  else if (combined < -0.55) recommendation = 'STRONG_SELL';
  else if (combined < -0.35) recommendation = 'SELL';
  else recommendation = 'HOLD';

  // Pack signals into the legacy format for frontend compatibility
  return {
    symbol,
    timestamp: new Date().toISOString(),
    momentum: trendSignals[0] || { name: 'Trend Momentum', score: 0, confidence: 0, reason: 'N/A' },
    meanReversion: reversionSignals[0] || { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'N/A' },
    sentiment: reversionSignals[1] || { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'N/A' },
    technical: trendSignals[1] || { name: 'MACD Trend', score: 0, confidence: 0, reason: 'N/A' },
    combined,
    recommendation,
    regime,
  };
}

// ═══════════════════════════════════════════════════════════
// Phase 5: ATR-Based Position Sizing + Risk Management
// ═══════════════════════════════════════════════════════════

function calculateATRPositionSize(portfolioValue, atr, currentPrice) {
  if (!atr || atr <= 0 || currentPrice <= 0) return 0;
  const riskAmount = portfolioValue * DEFAULT_CONFIG.riskPerTrade; // 1% of portfolio
  const stopDistance = DEFAULT_CONFIG.atrStopMultiplier * atr;      // 2×ATR
  const shares = riskAmount / stopDistance;
  // Cap at maxPositionSize of portfolio
  const maxShares = (portfolioValue * DEFAULT_CONFIG.maxPositionSize) / currentPrice;
  return Math.min(shares, maxShares);
}

function checkTrailingStop(holding, currentPrice, entryATR) {
  // Trailing stop: sell if price drops 2×ATR below high water mark
  if (!entryATR || entryATR <= 0) return false;
  const hwm = holding.highWaterMark || holding.avgCost;
  const stopPrice = hwm - DEFAULT_CONFIG.atrStopMultiplier * entryATR;
  return currentPrice <= stopPrice;
}

function checkProfitTake(holding, currentPrice, entryATR) {
  // Tiered profit taking: 25% at 3×ATR, 50% at 5×ATR
  if (!entryATR || entryATR <= 0) return 0;
  const gain = currentPrice - holding.avgCost;
  if (gain >= DEFAULT_CONFIG.atrProfit2Multiplier * entryATR) return 0.50;
  if (gain >= DEFAULT_CONFIG.atrProfit1Multiplier * entryATR) return 0.25;
  return 0;
}


function analyzeStock(symbol, intradayBars, dailyBars) {
  // Analyze using pre-fetched Alpaca intraday (5-min) and daily bars
  if (!intradayBars || intradayBars.length < 12) return { signal: null, lastPrice: null, atr: null };

  const dailyCloses = dailyBars ? dailyBars.map(b => b.close) : [];
  const dailyHighs = dailyBars ? dailyBars.map(b => b.high) : [];
  const dailyLows = dailyBars ? dailyBars.map(b => b.low) : [];
  const intradayCloses = intradayBars.map(b => b.close);
  const intradayHighs = intradayBars.map(b => b.high);
  const intradayLows = intradayBars.map(b => b.low);

  // Detect market regime from daily data
  const regime = detectRegime(dailyCloses, dailyHighs, dailyLows);

  // Group A — Trend-Following
  const trendMomentum = trendMomentumStrategy(dailyCloses, intradayCloses);
  const macdTrend = macdTrendStrategy(intradayCloses);

  // Group B — Mean-Reversion
  const bbRsi = bollingerRSIReversionStrategy(intradayCloses);
  const vwap = vwapReversionStrategy(intradayBars);

  // Regime-weighted combination
  const signal = combineSignals(symbol, [trendMomentum, macdTrend], [bbRsi, vwap], regime);
  const lastPrice = intradayBars[intradayBars.length - 1].close;

  // Compute ATR for position sizing and stop management
  const atr = computeATR(intradayHighs, intradayLows, intradayCloses, 14) ||
              computeATR(dailyHighs, dailyLows, dailyCloses, 14);

  return { signal, lastPrice, atr };
}

// Main execution
async function main() {
  console.log('Starting trading bot...');

  // Check credentials
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('Missing Redis credentials');
    process.exit(1);
  }
  if (!ALPACA_API_KEY || !ALPACA_SECRET_KEY) {
    console.error('Missing Alpaca API credentials (ALPACA_API_KEY / ALPACA_SECRET_KEY)');
    process.exit(1);
  }

  let portfolio = await getPortfolio();
  await syncAlpacaPositions();
  const allSignals = {};
  const priceCache = {};

  // Determine assets to analyze (Alpaca for stocks/crypto, Yahoo for forex/futures)
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let assetsToAnalyze = [...CRYPTO_SYMBOLS];
  if (!isWeekend) {
    assetsToAnalyze.push(...SP500_SYMBOLS, ...ETF_SYMBOLS, ...NASDAQ_ADDITIONAL);
    assetsToAnalyze.push(...FOREX_SYMBOLS, ...FUTURES_SYMBOLS);
  }
  // Always include current holdings so we can generate signals and make sell decisions
  for (const holding of portfolio.holdings) {
    assetsToAnalyze.push(holding.symbol);
  }
  // Deduplicate
  assetsToAnalyze = [...new Set(assetsToAnalyze)];

  console.log(`Analyzing ${assetsToAnalyze.length} assets (Weekend: ${isWeekend})...`);

  // Batch fetch all market data (Alpaca for stocks/crypto, Yahoo for forex/futures)
  const marketData = await fetchAllMarketData(assetsToAnalyze);

  // Analyze each symbol using pre-fetched data
  const atrCache = {}; // symbol → ATR value for position sizing
  for (const symbol of assetsToAnalyze) {
    try {
      const intradayBars = marketData.intraday[symbol] || [];
      const dailyBars = marketData.daily[symbol] || [];
      const result = analyzeStock(symbol, intradayBars, dailyBars);

      if (result.lastPrice) {
        priceCache[symbol] = result.lastPrice;
      }
      if (result.atr) {
        atrCache[symbol] = result.atr;
      }
      if (result.signal) {
        allSignals[symbol] = { ...result.signal, price: result.lastPrice };
      } else {
        allSignals[symbol] = {
          symbol,
          timestamp: new Date().toISOString(),
          momentum: { name: 'Trend Momentum', score: 0, confidence: 0, reason: 'No market data available' },
          meanReversion: { name: 'BB+RSI Reversion', score: 0, confidence: 0, reason: 'No market data available' },
          sentiment: { name: 'VWAP Reversion', score: 0, confidence: 0, reason: 'No market data available' },
          technical: { name: 'MACD Trend', score: 0, confidence: 0, reason: 'No market data available' },
          combined: 0,
          recommendation: 'HOLD',
          regime: 'UNKNOWN',
        };
      }
    } catch (error) {
      console.error(`Error analyzing ${symbol}:`, error.message);
    }
  }

  console.log(`Analyzed ${Object.keys(allSignals).length} assets successfully`);

  // Update holding prices and high water marks
  for (const holding of portfolio.holdings) {
    let price = priceCache[holding.symbol];
    if (!price) {
      const quote = await fetchYahooQuote(holding.symbol);
      if (quote) {
        price = quote.price;
        priceCache[holding.symbol] = price;
        holding.isExtendedHours = quote.isExtendedHours;
        holding.dividendYield = quote.dividendYield;
        holding.annualDividend = quote.annualDividend;
      }
    }
    if (price) {
      holding.currentPrice = price;
      holding.marketValue = holding.shares * price;
      holding.gainLoss = (price - holding.avgCost) * holding.shares;
      holding.gainLossPercent = ((price - holding.avgCost) / holding.avgCost) * 100;
      holding.priceUpdatedAt = new Date().toISOString();
      // Update high water mark for trailing stop
      holding.highWaterMark = Math.max(holding.highWaterMark || holding.avgCost, price);
    }
    // Track bars held (increment each cycle — each cycle ≈ 10 min interval)
    holding.barsHeld = (holding.barsHeld || 0) + 1;
  }

  // ═══════════════════════════════════════════════════════════
  // Sell Logic — ATR trailing stops + profit tiers + min hold
  // ═══════════════════════════════════════════════════════════
  for (const holding of portfolio.holdings) {
    const signal = allSignals[holding.symbol];
    const price = priceCache[holding.symbol] || holding.currentPrice;
    if (!price) continue;

    const entryATR = holding.entryATR || atrCache[holding.symbol];
    const barsHeld = holding.barsHeld || 0;

    // ATR trailing stop always fires regardless of cooldown or hold period
    const isTrailingStop = entryATR ? checkTrailingStop(holding, price, entryATR) : false;

    // Min hold period: don't sell for non-stop reasons if held < minHoldBars
    if (!isTrailingStop && barsHeld < DEFAULT_CONFIG.minHoldBars) continue;
    if (!isTrailingStop && isOnCooldown(holding.symbol)) continue;

    let sellPercent = 0;
    let sellReason = '';

    if (isTrailingStop) {
      sellPercent = 1.0;
      const hwm = holding.highWaterMark || holding.avgCost;
      sellReason = `ATR trailing stop (HWM $${hwm.toFixed(2)}, stop $${(hwm - DEFAULT_CONFIG.atrStopMultiplier * entryATR).toFixed(2)})`;
    } else if (!signal) {
      sellPercent = 1.0;
      sellReason = 'No signal data - rotating out';
    } else if (signal.recommendation === 'STRONG_SELL') {
      sellPercent = 1.0;
      sellReason = `STRONG_SELL: score ${signal.combined.toFixed(2)}`;
    } else if (signal.recommendation === 'SELL') {
      sellPercent = 0.75;
      sellReason = `SELL: score ${signal.combined.toFixed(2)}`;
    } else if (entryATR) {
      // ATR-based profit taking
      const profitPercent = checkProfitTake(holding, price, entryATR);
      if (profitPercent > 0) {
        sellPercent = profitPercent;
        const atrGain = (price - holding.avgCost) / entryATR;
        sellReason = `Profit take ${(profitPercent * 100).toFixed(0)}% at ${atrGain.toFixed(1)}×ATR gain`;
      }
    }

    if (sellPercent > 0) {
      const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;
      const total = sharesToSell * price;
      // Deduct transaction cost
      const txCost = total * DEFAULT_CONFIG.transactionCostBps / 10000;

      const trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: holding.symbol,
        action: 'SELL',
        shares: sharesToSell,
        price,
        total,
        reason: sellReason,
        signals: signal || { symbol: holding.symbol, timestamp: new Date().toISOString(), momentum: {}, meanReversion: {}, sentiment: {}, technical: {}, combined: 0, recommendation: 'HOLD' },
        gainLoss: (price - holding.avgCost) * sharesToSell,
        gainLossPercent: holding.gainLossPercent,
      };

      portfolio.cash += total - txCost;

      if (sharesToSell >= holding.shares) {
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
      } else {
        holding.shares -= sharesToSell;
        holding.marketValue = holding.shares * price;
      }

      await addTrade(trade);
      setCooldown(trade.symbol);
      await submitAlpacaOrder(trade.symbol, trade.shares, 'sell');
      console.log(`SELL ${trade.shares} ${trade.symbol} @ $${trade.price}: ${sellReason}`);
    }
  }

  // Position rotation: sell weakest holdings to free cash for stronger candidates
  const targetCash = portfolio.totalValue * DEFAULT_CONFIG.targetCashRatio;
  const availableCash = Math.max(0, portfolio.cash - targetCash);
  const strongBuyCandidates = Object.values(allSignals)
    .filter(s => s.combined > DEFAULT_CONFIG.buyThreshold && !portfolio.holdings.some(h => h.symbol === s.symbol))
    .length;

  if (strongBuyCandidates > 0 && (availableCash < DEFAULT_CONFIG.minTradeValue || portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions)) {
    const holdingsWithSignals = portfolio.holdings
      .map(h => ({ holding: h, signal: allSignals[h.symbol] }))
      .filter(h => h.signal && (h.holding.barsHeld || 0) >= DEFAULT_CONFIG.minHoldBars)
      .sort((a, b) => a.signal.combined - b.signal.combined);

    let rotated = 0;
    for (const { holding, signal } of holdingsWithSignals) {
      if (rotated >= 3) break;
      if (signal.combined >= DEFAULT_CONFIG.buyThreshold) break;
      if (isOnCooldown(holding.symbol)) continue;

      const rotatePrice = priceCache[holding.symbol] || holding.currentPrice;
      if (!rotatePrice) continue;

      const total = holding.shares * rotatePrice;
      const txCost = total * DEFAULT_CONFIG.transactionCostBps / 10000;

      const trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: holding.symbol,
        action: 'SELL',
        shares: holding.shares,
        price: rotatePrice,
        total,
        reason: `Rotation: weak signal (${signal.combined.toFixed(3)}) → stronger candidates`,
        signals: signal,
        gainLoss: (rotatePrice - holding.avgCost) * holding.shares,
        gainLossPercent: holding.gainLossPercent,
      };

      portfolio.cash += total - txCost;
      portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
      await addTrade(trade);
      setCooldown(trade.symbol);
      await submitAlpacaOrder(trade.symbol, trade.shares, 'sell');
      console.log(`ROTATE OUT ${trade.shares} ${trade.symbol} @ $${trade.price} (signal: ${signal.combined.toFixed(3)})`);
      rotated++;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // Buy Logic — ATR position sizing, capped new positions
  // ═══════════════════════════════════════════════════════════
  const openSlots = DEFAULT_CONFIG.maxPositions - portfolio.holdings.length;
  const buyCandidates = Object.values(allSignals)
    .filter(s => s.combined > DEFAULT_CONFIG.buyThreshold && !portfolio.holdings.some(h => h.symbol === s.symbol) && !isOnCooldown(s.symbol))
    .sort((a, b) => b.combined - a.combined)
    .slice(0, Math.min(openSlots, DEFAULT_CONFIG.maxNewPositionsPerCycle));

  if (buyCandidates.length > 0) {
    const targetCashBuy = portfolio.totalValue * DEFAULT_CONFIG.targetCashRatio;
    let cashAvailable = Math.max(0, portfolio.cash - targetCashBuy);

    console.log(`\nBuy candidates: ${buyCandidates.length} | Available cash: $${cashAvailable.toFixed(2)}`);

    for (const signal of buyCandidates) {
      if (cashAvailable < DEFAULT_CONFIG.minTradeValue) break;

      let buyPrice = priceCache[signal.symbol];
      if (!buyPrice) {
        const quote = await fetchYahooQuote(signal.symbol);
        if (quote) {
          buyPrice = quote.price;
          priceCache[signal.symbol] = buyPrice;
        }
      }
      if (!buyPrice) continue;

      // ATR-based position sizing
      const atr = atrCache[signal.symbol];
      let shares;
      if (atr && atr > 0) {
        shares = calculateATRPositionSize(portfolio.totalValue, atr, buyPrice);
      } else {
        // Fallback: proportional allocation capped at maxPositionSize
        shares = (portfolio.totalValue * DEFAULT_CONFIG.maxPositionSize) / buyPrice;
      }
      shares = Math.round(shares * 10000) / 10000;
      const total = shares * buyPrice;

      // Ensure we don't exceed available cash
      if (total > cashAvailable) {
        shares = Math.round((cashAvailable / buyPrice) * 10000) / 10000;
      }
      if (shares < 0.0001) continue;

      const finalTotal = shares * buyPrice;
      if (finalTotal < DEFAULT_CONFIG.minTradeValue) continue;

      // Deduct transaction cost
      const txCost = finalTotal * DEFAULT_CONFIG.transactionCostBps / 10000;

      const trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: signal.symbol,
        action: 'BUY',
        shares,
        price: buyPrice,
        total: finalTotal,
        reason: `${signal.recommendation}: score ${signal.combined.toFixed(2)} [${signal.regime || 'UNKNOWN'}]`,
        signals: signal,
      };

      portfolio.cash -= finalTotal + txCost;
      cashAvailable -= finalTotal + txCost;
      portfolio.holdings.push({
        symbol: signal.symbol,
        shares,
        avgCost: buyPrice,
        currentPrice: buyPrice,
        marketValue: finalTotal,
        gainLoss: 0,
        gainLossPercent: 0,
        priceUpdatedAt: new Date().toISOString(),
        highWaterMark: buyPrice,
        entryATR: atr || null,
        entryTimestamp: new Date().toISOString(),
        barsHeld: 0,
      });

      await addTrade(trade);
      setCooldown(signal.symbol);
      await submitAlpacaOrder(signal.symbol, shares, 'buy');
      console.log(`BUY ${shares} ${signal.symbol} @ $${buyPrice} ($${finalTotal.toFixed(2)}) [ATR: ${atr ? atr.toFixed(3) : 'N/A'}]`);
    }
  }

  // Update portfolio totals
  const holdingsValue = portfolio.holdings.reduce((sum, h) => sum + h.marketValue, 0);
  portfolio.totalValue = portfolio.cash + holdingsValue;
  portfolio.lastUpdated = new Date().toISOString();

  // Save everything
  await savePortfolio(portfolio);
  await saveSignals(allSignals);
  await setLastRun(new Date().toISOString());
  await addPortfolioSnapshot({ timestamp: new Date().toISOString(), totalValue: portfolio.totalValue });
  await updateSPYBenchmark();

  console.log(`\nCompleted! Portfolio: $${portfolio.totalValue.toFixed(2)} | Holdings: ${portfolio.holdings.length} | Cash: $${portfolio.cash.toFixed(2)}`);
}

// Graceful shutdown handling
function setupShutdownHandlers() {
  const shutdown = async (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    isShuttingDown = true;

    if (currentRunPromise) {
      console.log('Waiting for current run to complete...');
      await currentRunPromise;
    }

    console.log('Trading bot stopped.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Service loop
async function runService() {
  // Handle --reset flag: reset portfolio to initialCapital and clear all history
  if (process.argv.includes('--reset')) {
    console.log('Resetting portfolio...');
    const freshPortfolio = {
      cash: DEFAULT_CONFIG.initialCapital,
      holdings: [],
      totalValue: DEFAULT_CONFIG.initialCapital,
      lastUpdated: new Date().toISOString(),
      initialCapital: DEFAULT_CONFIG.initialCapital,
    };
    await savePortfolio(freshPortfolio);
    await redis.set(KEYS.TRADES, []);
    await redis.set(KEYS.SIGNALS, {});
    await redis.set(KEYS.HISTORY, []);
    await redis.set(KEYS.SPY_BENCHMARK, []);
    console.log(`Portfolio reset to $${DEFAULT_CONFIG.initialCapital}`);
    console.log('Cleared: history, trades, signals, S&P 500 benchmark.');
    process.exit(0);
  }

  setupShutdownHandlers();

  console.log('='.repeat(60));
  console.log('Trading Bot Service Started');
  console.log(`Interval: ${RUN_INTERVAL_MS / 1000} seconds`);
  console.log(`Mode: ${RUN_ONCE ? 'Single Run' : 'Continuous Service'}`);
  console.log('='.repeat(60));

  while (!isShuttingDown) {
    const startTime = Date.now();

    try {
      currentRunPromise = main();
      await currentRunPromise;
      currentRunPromise = null;
    } catch (error) {
      console.error('Run failed:', error);
      currentRunPromise = null;
    }

    if (RUN_ONCE) {
      console.log('Single run mode - exiting.');
      break;
    }

    if (isShuttingDown) break;

    const elapsed = Date.now() - startTime;
    const waitTime = Math.max(0, RUN_INTERVAL_MS - elapsed);

    if (waitTime > 0) {
      console.log(`\nNext run in ${Math.round(waitTime / 1000)} seconds...`);
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, waitTime);
        // Allow early exit on shutdown
        const checkShutdown = setInterval(() => {
          if (isShuttingDown) {
            clearTimeout(timeout);
            clearInterval(checkShutdown);
            resolve();
          }
        }, 1000);
      });
    }
  }
}

runService().catch(console.error);
