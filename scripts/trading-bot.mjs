#!/usr/bin/env node
/**
 * Trading Bot Script - Self-hosted continuous service
 * Runs as a daemon analyzing hourly candles every 10 minutes
 */

import { Redis } from '@upstash/redis';

// Service Configuration
const RUN_INTERVAL_MS = parseInt(process.env.RUN_INTERVAL_MS || '600000', 10); // Default: 10 minutes
const RUN_ONCE = process.env.RUN_ONCE === 'true'; // For GitHub Actions compatibility
let isShuttingDown = false;
let currentRunPromise = null;

// Configuration
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 400;
const DEFAULT_CONFIG = {
  initialCapital: 10199.33,
  maxPositionSize: 0.04,
  maxPositions: 50,
  minTradeValue: 15,
  targetCashRatio: 0,
  strategyWeights: {
    momentum: 0.08,
    meanReversion: 0.41,
    sentiment: 0.15,
    technical: 0.36,
  },
};

// Asset lists
const CRYPTO_SYMBOLS = [
  'BTC-USD', 'ETH-USD', 'BNB-USD', 'XRP-USD', 'SOL-USD', 'ADA-USD', 'DOGE-USD',
  'AVAX-USD', 'DOT-USD', 'MATIC-USD', 'LINK-USD', 'SHIB-USD', 'LTC-USD',
  'ATOM-USD', 'UNI-USD', 'XLM-USD', 'NEAR-USD', 'APT-USD', 'OP-USD', 'ARB-USD',
  'FIL-USD', 'HBAR-USD', 'ICP-USD', 'VET-USD', 'AAVE-USD', 'MKR-USD', 'GRT-USD',
  'INJ-USD', 'RUNE-USD', 'FTM-USD',
];

const FOREX_SYMBOLS = [
  'EURUSD=X', 'GBPUSD=X', 'USDJPY=X', 'USDCHF=X', 'AUDUSD=X', 'USDCAD=X',
  'NZDUSD=X', 'EURGBP=X', 'EURJPY=X', 'GBPJPY=X', 'AUDJPY=X', 'CADJPY=X',
  'EURAUD=X', 'EURCHF=X', 'GBPCHF=X', 'USDMXN=X', 'USDZAR=X', 'USDTRY=X',
  'USDINR=X', 'USDCNY=X',
];

const FUTURES_SYMBOLS = [
  'ES=F', 'NQ=F', 'YM=F', 'RTY=F', 'GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F',
  'HG=F', 'PL=F', 'ZC=F', 'ZW=F', 'ZS=F', 'ZB=F', 'ZN=F', '6E=F', '6B=F', '6J=F',
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

// SPY Benchmark caching (runs from LXC to avoid Vercel IP blocks)
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
      `https://query1.finance.yahoo.com/v8/finance/chart/SPY?period1=${start}&period2=${end}&interval=1h`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.log(`SPY benchmark fetch failed: ${response.status}`);
      return;
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result?.timestamp || !result?.indicators?.quote?.[0]?.close) {
      console.log('Invalid SPY response structure');
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
      console.log(`SPY benchmark cached: ${benchmark.length} data points`);
    } else {
      console.log('SPY benchmark: no valid data points');
    }
  } catch (error) {
    console.log(`SPY benchmark error: ${error.message}`);
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

async function fetchYahooHistorical(symbol) {
  try {
    // Hourly candles over 3 months: SMA-20=3 days, SMA-50=~8 days, standard TA timeframes
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=3mo&interval=1h`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];

    return timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      }))
      .filter(d => d.open !== null && d.high !== null && d.low !== null && d.close !== null);
  } catch (error) {
    console.error(`Error fetching historical for ${symbol}:`, error.message);
    return null;
  }
}

async function fetchYahooDaily(symbol) {
  try {
    // 1 year of daily candles for long-term momentum calculation
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1y&interval=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' } }
    );
    const data = await response.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp || !result?.indicators?.quote?.[0]) return null;

    const { timestamp, indicators } = result;
    const quote = indicators.quote[0];

    return timestamp
      .map((ts, i) => ({
        date: new Date(ts * 1000).toISOString(),
        open: quote.open[i],
        high: quote.high[i],
        low: quote.low[i],
        close: quote.close[i],
        volume: quote.volume[i],
      }))
      .filter(d => d.open !== null && d.high !== null && d.low !== null && d.close !== null);
  } catch (error) {
    console.error(`Error fetching daily data for ${symbol}:`, error.message);
    return null;
  }
}

// Strategy calculations
function calculateRSI(data, period = 14) {
  if (data.length < period + 1) return 50;
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }
  const recentChanges = changes.slice(-period);
  const gains = recentChanges.filter(c => c > 0);
  const losses = recentChanges.filter(c => c < 0).map(c => Math.abs(c));
  const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / period : 0;
  const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / period : 0;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateMomentumSignal(dailyData) {
  // Long-term momentum using daily candles (academic standard)
  // Need at least 252 trading days (1 year) for 12-1 momentum factor
  if (!dailyData || dailyData.length < 252) {
    return { name: 'Momentum', score: 0, confidence: 0, reason: 'Insufficient daily data (need 1y)' };
  }

  const currentPrice = dailyData[dailyData.length - 1].close;
  const reasons = [];
  let score = 0;

  // 12-1 Momentum (Jegadeesh-Titman): return from 12 months ago to 1 month ago
  // Skips last month to avoid short-term reversal effect
  const price12moAgo = dailyData[dailyData.length - 252].close;
  const price1moAgo = dailyData[dailyData.length - 21].close;
  const mom12_1 = ((price1moAgo - price12moAgo) / price12moAgo) * 100;

  // 6-month return
  const price6moAgo = dailyData[dailyData.length - 126].close;
  const mom6m = ((currentPrice - price6moAgo) / price6moAgo) * 100;

  // 3-month return
  const price3moAgo = dailyData[dailyData.length - 63].close;
  const mom3m = ((currentPrice - price3moAgo) / price3moAgo) * 100;

  // 12-1 momentum scoring (~40% of total signal — the classic academic factor)
  if (mom12_1 > 30) { score += 0.4; }
  else if (mom12_1 > 15) { score += 0.3; }
  else if (mom12_1 > 5) { score += 0.15; }
  else if (mom12_1 > -5) { score += 0; }
  else if (mom12_1 > -15) { score -= 0.15; }
  else if (mom12_1 > -30) { score -= 0.3; }
  else { score -= 0.4; }
  reasons.push(`12-1: ${mom12_1 >= 0 ? '+' : ''}${mom12_1.toFixed(0)}%`);

  // 6-month momentum scoring (~35%)
  if (mom6m > 20) { score += 0.35; }
  else if (mom6m > 10) { score += 0.2; }
  else if (mom6m > 3) { score += 0.1; }
  else if (mom6m > -3) { score += 0; }
  else if (mom6m > -10) { score -= 0.1; }
  else if (mom6m > -20) { score -= 0.2; }
  else { score -= 0.35; }
  reasons.push(`6mo: ${mom6m >= 0 ? '+' : ''}${mom6m.toFixed(0)}%`);

  // 3-month momentum scoring (~25%)
  if (mom3m > 15) { score += 0.25; }
  else if (mom3m > 7) { score += 0.15; }
  else if (mom3m > 2) { score += 0.05; }
  else if (mom3m > -2) { score += 0; }
  else if (mom3m > -7) { score -= 0.05; }
  else if (mom3m > -15) { score -= 0.15; }
  else { score -= 0.25; }
  reasons.push(`3mo: ${mom3m >= 0 ? '+' : ''}${mom3m.toFixed(0)}%`);

  return {
    name: 'Momentum',
    score: Math.max(-1, Math.min(1, score)),
    confidence: 0.75,
    reason: reasons.join(', '),
  };
}

function calculateMeanReversionSignal(data) {
  if (data.length < 50) return { name: 'Mean Reversion', score: 0, confidence: 0, reason: 'Insufficient data' };

  const currentPrice = data[data.length - 1].close;

  // With hourly candles: 200 bars ≈ 30 trading days, 20 bars ≈ 3 trading days
  const longPeriod = Math.min(200, data.length);
  const pricesLong = data.slice(-longPeriod).map(d => d.close);
  const meanLong = pricesLong.reduce((a, b) => a + b, 0) / pricesLong.length;
  const stdDevLong = Math.sqrt(pricesLong.reduce((sum, p) => sum + Math.pow(p - meanLong, 2), 0) / pricesLong.length);

  // Short-term z-score (20-period Bollinger Band style)
  const prices20 = data.slice(-20).map(d => d.close);
  const mean20 = prices20.reduce((a, b) => a + b, 0) / prices20.length;
  const stdDev20 = Math.sqrt(prices20.reduce((sum, p) => sum + Math.pow(p - mean20, 2), 0) / prices20.length);
  const shortZ = stdDev20 > 0 ? (currentPrice - mean20) / stdDev20 : 0;

  // Long-term z-score (how far from longer average)
  const longZ = stdDevLong > 0 ? (currentPrice - meanLong) / stdDevLong : 0;

  // Combine: weight toward long-term (true mean reversion) with short-term confirmation
  const zScore = longZ * 0.7 + shortZ * 0.3;
  const pctFromMean = meanLong > 0 ? ((currentPrice - meanLong) / meanLong * 100).toFixed(1) : '0.0';

  let score = 0;
  let reason = '';

  if (zScore < -2) { score = 0.8; reason = `Extremely oversold (z=${zScore.toFixed(2)}, ${pctFromMean}% from mean)`; }
  else if (zScore < -1.5) { score = 0.6; reason = `Very oversold (z=${zScore.toFixed(2)}, ${pctFromMean}% from mean)`; }
  else if (zScore < -1) { score = 0.4; reason = `Oversold (z=${zScore.toFixed(2)})`; }
  else if (zScore < -0.5) { score = 0.2; reason = `Slightly below mean (z=${zScore.toFixed(2)})`; }
  else if (zScore > 2) { score = -0.8; reason = `Extremely overbought (z=${zScore.toFixed(2)}, +${pctFromMean}% from mean)`; }
  else if (zScore > 1.5) { score = -0.6; reason = `Very overbought (z=${zScore.toFixed(2)})`; }
  else if (zScore > 1) { score = -0.4; reason = `Overbought (z=${zScore.toFixed(2)})`; }
  else if (zScore > 0.5) { score = -0.2; reason = `Slightly above mean (z=${zScore.toFixed(2)})`; }
  else { score = 0; reason = `Near mean (z=${zScore.toFixed(2)})`; }

  return { name: 'Mean Reversion', score, confidence: 0.6, reason };
}

function calculateTechnicalSignal(data) {
  if (data.length < 20) return { name: 'Technical', score: 0, confidence: 0, reason: 'Insufficient data' };

  const rsi = calculateRSI(data);
  let score = 0;
  const reasons = [];

  if (rsi < 30) { score += 0.5; reasons.push(`RSI oversold (${rsi.toFixed(0)})`); }
  else if (rsi < 40) { score += 0.25; reasons.push(`RSI low (${rsi.toFixed(0)})`); }
  else if (rsi > 70) { score -= 0.5; reasons.push(`RSI overbought (${rsi.toFixed(0)})`); }
  else if (rsi > 60) { score -= 0.25; reasons.push(`RSI high (${rsi.toFixed(0)})`); }
  else { reasons.push(`RSI neutral (${rsi.toFixed(0)})`); }

  const recentData = data.slice(-5);
  const avgVolume = data.slice(-20).reduce((sum, d) => sum + d.volume, 0) / 20;
  const recentVolume = recentData.reduce((sum, d) => sum + d.volume, 0) / 5;

  if (recentVolume > avgVolume * 1.5) {
    const priceChange = (recentData[recentData.length - 1].close - recentData[0].close) / recentData[0].close;
    if (priceChange > 0) { score += 0.25; reasons.push('High volume uptrend'); }
    else { score -= 0.25; reasons.push('High volume downtrend'); }
  }

  return { name: 'Technical', score: Math.max(-1, Math.min(1, score)), confidence: 0.65, reason: reasons.join(', ') };
}

function calculateSentimentSignal() {
  // Simplified sentiment (would need real news API for proper implementation)
  const score = (Math.random() - 0.5) * 0.4;
  return { name: 'Sentiment', score, confidence: 0.3, reason: 'Market sentiment analysis' };
}

function combineSignals(symbol, momentum, meanReversion, sentiment, technical, weights) {
  const combined =
    momentum.score * weights.momentum +
    meanReversion.score * weights.meanReversion +
    sentiment.score * weights.sentiment +
    technical.score * weights.technical;

  let recommendation;
  if (combined > 0.5) recommendation = 'STRONG_BUY';
  else if (combined > 0.15) recommendation = 'BUY';
  else if (combined < -0.5) recommendation = 'STRONG_SELL';
  else if (combined < -0.15) recommendation = 'SELL';
  else recommendation = 'HOLD';

  return {
    symbol,
    timestamp: new Date().toISOString(),
    momentum,
    meanReversion,
    sentiment,
    technical,
    combined,
    recommendation,
  };
}


async function analyzeStock(symbol) {
  // Fetch hourly (for mean reversion, technical) and daily (for momentum) in parallel
  const [historicalData, dailyData] = await Promise.all([
    fetchYahooHistorical(symbol),
    fetchYahooDaily(symbol),
  ]);
  if (!historicalData || historicalData.length < 50) return { signal: null, lastPrice: null };

  const momentum = calculateMomentumSignal(dailyData);
  const meanReversion = calculateMeanReversionSignal(historicalData);
  const technical = calculateTechnicalSignal(historicalData);
  const sentiment = calculateSentimentSignal();

  const signal = combineSignals(symbol, momentum, meanReversion, sentiment, technical, DEFAULT_CONFIG.strategyWeights);
  const lastPrice = historicalData[historicalData.length - 1].close;
  return { signal, lastPrice };
}

// Main execution
async function main() {
  console.log('Starting trading bot...');

  // Check Redis connection
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.error('Missing Redis credentials');
    process.exit(1);
  }

  let portfolio = await getPortfolio();
  const allSignals = {};
  const priceCache = {}; // Cache prices from analysis to avoid redundant API calls

  // Determine assets to analyze
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  let assetsToAnalyze = [...CRYPTO_SYMBOLS];
  if (!isWeekend) {
    assetsToAnalyze.push(...SP500_SYMBOLS, ...ETF_SYMBOLS, ...NASDAQ_ADDITIONAL, ...FOREX_SYMBOLS, ...FUTURES_SYMBOLS);
  }
  // Always include current holdings so we can generate signals and make sell decisions
  for (const holding of portfolio.holdings) {
    assetsToAnalyze.push(holding.symbol);
  }
  // Deduplicate
  assetsToAnalyze = [...new Set(assetsToAnalyze)];

  console.log(`Analyzing ${assetsToAnalyze.length} assets (Weekend: ${isWeekend})...`);

  // Process in batches
  for (let i = 0; i < assetsToAnalyze.length; i += BATCH_SIZE) {
    const batch = assetsToAnalyze.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(assetsToAnalyze.length / BATCH_SIZE);

    console.log(`Batch ${batchNum}/${totalBatches}: ${batch.join(', ')}`);

    const results = await Promise.all(batch.map(async (symbol) => {
      try {
        const result = await analyzeStock(symbol);
        return { symbol, ...result };
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error.message);
        return { symbol, signal: null, lastPrice: null };
      }
    }));

    for (const { symbol, signal, lastPrice } of results) {
      if (lastPrice) {
        priceCache[symbol] = lastPrice;
      }
      if (signal) {
        allSignals[symbol] = { ...signal, price: lastPrice };
      } else {
        // Store a placeholder signal so the frontend always shows something
        allSignals[symbol] = {
          symbol,
          timestamp: new Date().toISOString(),
          momentum: { name: 'Momentum', score: 0, confidence: 0, reason: 'No market data available' },
          meanReversion: { name: 'Mean Reversion', score: 0, confidence: 0, reason: 'No market data available' },
          sentiment: { name: 'Sentiment', score: 0, confidence: 0, reason: 'No market data available' },
          technical: { name: 'Technical', score: 0, confidence: 0, reason: 'No market data available' },
          combined: 0,
          recommendation: 'HOLD',
        };
      }
    }

    if (i + BATCH_SIZE < assetsToAnalyze.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`Analyzed ${Object.keys(allSignals).length} assets successfully`);

  // Update holding prices using cached prices from analysis (avoids rate-limiting)
  // Only fetch fresh quotes for holdings NOT in the price cache
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
    }
  }

  // Check for sells (uses already-cached prices, no redundant API calls)
  for (const holding of portfolio.holdings) {
    const signal = allSignals[holding.symbol];
    const price = priceCache[holding.symbol] || holding.currentPrice;
    if (!price) continue;

    let sellPercent = 0;
    let sellReason = '';

    if (!signal) {
      sellPercent = 1.0;
      sellReason = 'No signal data - rotating out';
    } else if (signal.recommendation === 'STRONG_SELL') {
      sellPercent = 1.0;
      sellReason = `STRONG_SELL: score ${signal.combined.toFixed(2)}`;
    } else if (holding.gainLossPercent <= -2) {
      sellPercent = 1.0;
      sellReason = `Stop loss at ${holding.gainLossPercent.toFixed(1)}%`;
    } else if (signal.combined < 0.02) {
      sellPercent = 1.0;
      sellReason = `Weak signal (${signal.combined.toFixed(3)})`;
    } else if (holding.gainLossPercent >= 2) {
      sellPercent = 0.5;
      sellReason = `Taking profits at ${holding.gainLossPercent.toFixed(1)}%`;
    } else if (signal.recommendation === 'SELL') {
      sellPercent = 0.75;
      sellReason = `SELL: score ${signal.combined.toFixed(2)}`;
    }

    if (sellPercent > 0) {
      const sharesToSell = Math.round(holding.shares * sellPercent * 10000) / 10000 || holding.shares;

      const trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: holding.symbol,
        action: 'SELL',
        shares: sharesToSell,
        price,
        total: sharesToSell * price,
        reason: sellReason,
        signals: signal || { symbol: holding.symbol, timestamp: new Date().toISOString(), momentum: {}, meanReversion: {}, sentiment: {}, technical: {}, combined: 0, recommendation: 'HOLD' },
        gainLoss: (price - holding.avgCost) * sharesToSell,
        gainLossPercent: holding.gainLossPercent,
      };

      portfolio.cash += trade.total;

      if (sharesToSell >= holding.shares) {
        portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
      } else {
        holding.shares -= sharesToSell;
        holding.marketValue = holding.shares * price;
      }

      await addTrade(trade);
      console.log(`SELL ${trade.shares} ${trade.symbol} @ $${trade.price}: ${sellReason}`);
    }
  }

  // Position rotation: sell weakest holdings to free cash for stronger candidates
  const targetCash = portfolio.totalValue * DEFAULT_CONFIG.targetCashRatio;
  const availableCash = Math.max(0, portfolio.cash - targetCash);
  const strongBuyCandidates = Object.values(allSignals)
    .filter(s => s.combined > 0.15 && !portfolio.holdings.some(h => h.symbol === s.symbol))
    .length;

  if (strongBuyCandidates > 0 && (availableCash < DEFAULT_CONFIG.minTradeValue || portfolio.holdings.length >= DEFAULT_CONFIG.maxPositions)) {
    // Find weakest holdings that we have signals for
    const holdingsWithSignals = portfolio.holdings
      .map(h => ({ holding: h, signal: allSignals[h.symbol] }))
      .filter(h => h.signal)
      .sort((a, b) => a.signal.combined - b.signal.combined);

    // Sell up to 3 weakest positions to free cash
    let rotated = 0;
    for (const { holding, signal } of holdingsWithSignals) {
      if (rotated >= 3) break;
      if (signal.combined >= 0.15) break; // Don't sell strong holdings

      const rotatePrice = priceCache[holding.symbol] || holding.currentPrice;
      if (!rotatePrice) continue;

      const trade = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        symbol: holding.symbol,
        action: 'SELL',
        shares: holding.shares,
        price: rotatePrice,
        total: holding.shares * rotatePrice,
        reason: `Rotation: weak signal (${signal.combined.toFixed(3)}) → stronger candidates`,
        signals: signal,
        gainLoss: (rotatePrice - holding.avgCost) * holding.shares,
        gainLossPercent: holding.gainLossPercent,
      };

      portfolio.cash += trade.total;
      portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== holding.symbol);
      await addTrade(trade);
      console.log(`ROTATE OUT ${trade.shares} ${trade.symbol} @ $${trade.price} (signal: ${signal.combined.toFixed(3)})`);
      rotated++;
    }
  }

  // Check for buys — pre-allocate cash across ALL candidates proportionally
  const openSlots = DEFAULT_CONFIG.maxPositions - portfolio.holdings.length;
  const buyCandidates = Object.values(allSignals)
    .filter(s => s.combined > 0.02 && !portfolio.holdings.some(h => h.symbol === s.symbol))
    .sort((a, b) => b.combined - a.combined)
    .slice(0, openSlots);

  if (buyCandidates.length > 0) {
    const targetCash = portfolio.totalValue * DEFAULT_CONFIG.targetCashRatio;
    const availableCash = Math.max(0, portfolio.cash - targetCash);
    const maxPosition = portfolio.totalValue * DEFAULT_CONFIG.maxPositionSize;

    // Assign each candidate a share of cash proportional to signal strength
    const totalStrength = buyCandidates.reduce((sum, s) => sum + Math.abs(s.combined), 0);
    let allocations = buyCandidates.map(signal => {
      const weight = Math.abs(signal.combined) / totalStrength;
      return { signal, size: Math.min(availableCash * weight, maxPosition) };
    });

    // If capping at maxPosition freed up cash, redistribute to uncapped positions
    const cappedTotal = allocations.reduce((sum, a) => sum + a.size, 0);
    if (cappedTotal < availableCash) {
      const uncapped = allocations.filter(a => a.size < maxPosition);
      const excess = availableCash - cappedTotal;
      const uncappedStrength = uncapped.reduce((sum, a) => sum + Math.abs(a.signal.combined), 0);
      if (uncappedStrength > 0) {
        for (const alloc of uncapped) {
          const bonus = excess * (Math.abs(alloc.signal.combined) / uncappedStrength);
          alloc.size = Math.min(alloc.size + bonus, maxPosition);
        }
      }
    }

    // Scale down if total still exceeds available cash
    const totalAllocated = allocations.reduce((sum, a) => sum + a.size, 0);
    if (totalAllocated > availableCash) {
      const scale = availableCash / totalAllocated;
      allocations = allocations.map(a => ({ ...a, size: a.size * scale }));
    }

    console.log(`\nBuy candidates: ${buyCandidates.length} | Available cash: $${availableCash.toFixed(2)}`);

    for (const { signal, size } of allocations) {
      if (size < DEFAULT_CONFIG.minTradeValue) continue;

      let buyPrice = priceCache[signal.symbol];
      if (!buyPrice) {
        const quote = await fetchYahooQuote(signal.symbol);
        if (quote) {
          buyPrice = quote.price;
          priceCache[signal.symbol] = buyPrice;
        }
      }
      if (buyPrice) {
        const shares = Math.round((size / buyPrice) * 10000) / 10000;
        if (shares >= 0.0001) {
          const total = shares * buyPrice;

          const trade = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            symbol: signal.symbol,
            action: 'BUY',
            shares,
            price: buyPrice,
            total,
            reason: `${signal.recommendation}: score ${signal.combined.toFixed(2)}`,
            signals: signal,
          };

          portfolio.cash -= total;
          portfolio.holdings.push({
            symbol: signal.symbol,
            shares,
            avgCost: buyPrice,
            currentPrice: buyPrice,
            marketValue: total,
            gainLoss: 0,
            gainLossPercent: 0,
            priceUpdatedAt: new Date().toISOString(),
          });

          await addTrade(trade);
          console.log(`BUY ${shares} ${signal.symbol} @ $${buyPrice} ($${total.toFixed(2)})`);
        }
      }
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
    console.log('Cleared: history, trades, signals, SPY benchmark.');
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
