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
// NASDAQ Stocks (Comprehensive list - ~400 stocks)
// Includes NASDAQ-100, growth stocks, biotech, tech, and more
// ============================================================
export const NASDAQ_ADDITIONAL = [
  // === NASDAQ-100 Core (not in S&P 500) ===
  'MELI', 'TEAM', 'LCID', 'RIVN', 'OKTA', 'ZM', 'DOCU', 'ROKU', 'NET',
  'CRSP', 'ASML', 'MRVL', 'PDD', 'JD', 'BIDU', 'NTES', 'TCOM',

  // === Growth & Momentum Stocks ===
  'SOFI', 'UPST', 'AFRM', 'PATH', 'SNOW', 'DKNG', 'RBLX', 'U', 'BILL',
  'HUBS', 'TWLO', 'MDB', 'CFLT', 'GTLB', 'S', 'DUOL', 'PINS', 'SNAP',
  'SPOT', 'LYFT', 'GRAB', 'SE', 'SHOP', 'SQ', 'FUBO',

  // === Biotech & Pharma ===
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

  // === Tech & AI/ML ===
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

  // === Semiconductors ===
  'WOLF', 'ACLS', 'ALGM', 'AMKR', 'AOSL', 'ASPN', 'ATOM', 'AXTI',
  'CAMT', 'CRUS', 'DIOD', 'FORM', 'INDI', 'IPGP', 'ISSI', 'ITOS',
  'KLIC', 'LEDS', 'LITE', 'MASI', 'MKSI', 'MTSI', 'NOVT', 'NXPI',
  'OLED', 'ONTO', 'PLAB', 'POWI', 'QRVO', 'RMBS', 'SITM', 'SLAB',
  'SMTC', 'SYNA', 'TER', 'UCTT', 'VECO', 'VIAV', 'VSH', 'WRAP',

  // === Consumer & Retail ===
  'FIVE', 'OLLI', 'RH', 'W', 'CHWY', 'CPNG', 'BABA', 'BGFV', 'BIRD',
  'BOOT', 'BROS', 'CAKE', 'CARS', 'CASA', 'CATO', 'CONN', 'COUR',
  'CURV', 'EAT', 'ELF', 'EVRI', 'FIZZ', 'FOXF', 'FRPT', 'FTDR',
  'GOOS', 'GPRO', 'HAIN', 'HIBB', 'HZO', 'IMKTA', 'JACK', 'LANC',
  'LCUT', 'LEVI', 'LOVE', 'MCBC', 'MED', 'MELI', 'MNST', 'NATH',
  'NCLH', 'ONON', 'ORLY', 'PTON', 'REAL', 'RMNI', 'SABR', 'SAVE',
  'SCVL', 'SHAK', 'SITE', 'SFIX', 'SKYW', 'SNBR', 'SPTN', 'SSYS',
  'STNE', 'SWBI', 'TACO', 'TAST', 'TNET', 'TRIP', 'TXRH', 'VIR',
  'VRNT', 'VSCO', 'WINA', 'WING', 'WOOF', 'WW', 'YELP', 'YETI',

  // === EV & Clean Energy ===
  'NIO', 'XPEV', 'LI', 'FSR', 'GOEV', 'WKHS', 'HYLN', 'CHPT', 'BLNK',
  'EVGO', 'QS', 'PLUG', 'FCEL', 'BE', 'SEDG', 'RUN', 'ARRY', 'BLDP',
  'CLNE', 'ENVX', 'EVEX', 'FLNC', 'FREY', 'GEVO', 'HYZN', 'LEV',
  'LILM', 'MVST', 'NKLA', 'NOVA', 'OUST', 'PTRA', 'REE', 'RMO',
  'SHLS', 'SLDP', 'SPWR', 'STEM', 'VLD', 'XL', 'AEHR', 'AMPX',
  'AMPS', 'ARBE', 'ARVL', 'BEEM', 'CALX', 'DRIV', 'EOSE', 'FFIE',
  'FUV', 'LAZR', 'LCID', 'MULN', 'PLTK', 'PODD', 'PRCH', 'SLDP',

  // === Fintech & Financial ===
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

  // === Media & Entertainment ===
  'PARA', 'BMBL', 'ATVI', 'CARG', 'CHDN', 'CNK', 'CPRI', 'CROX',
  'CWST', 'DXPE', 'EYE', 'FOSL', 'GIII', 'GRPN', 'HAFC', 'HLI',
  'IMAX', 'INSW', 'LAUR', 'LINC', 'LIND', 'LNW', 'LPTH', 'LSXMA',
  'LSXMK', 'MARA', 'NAVI', 'NXGN', 'OPRA', 'PENN', 'PLYA', 'PRGS',
  'QNST', 'RCII', 'RIOT', 'SIRI', 'SONO', 'SPHR', 'STAA', 'STRA',
  'STRR', 'TARS', 'TME', 'TRMK', 'TUYA', 'WMG', 'WWE', 'XMTR', 'ZUMZ',

  // === Communications & Telecom ===
  'LUMN', 'FYBR', 'USM', 'SATS', 'GSAT', 'IRDM', 'ASTS', 'BAND',
  'BCOV', 'CALX', 'CASA', 'CCOI', 'CIEN', 'CIIG', 'CLFD', 'CNSL',
  'COMM', 'CRNT', 'CTL', 'DZSI', 'EXTR', 'GILT', 'GOGO', 'HLIT',
  'IDCC', 'INFN', 'INSG', 'LILA', 'LILAK', 'LTRX', 'LUMEN', 'MAXR',
  'MTCR', 'NTGR', 'OOMA', 'PDCO', 'RBBN', 'RDWR', 'SIFY', 'SPTN',
  'SWIR', 'TZOO', 'UBNT', 'UI', 'UTI', 'VSAT', 'WSTC', 'ZGID',

  // === Industrial & Transportation ===
  'SAIA', 'LSTR', 'WERN', 'KNX', 'SNDR', 'AAWW', 'ABUS', 'ACHC',
  'ACLE', 'ACMR', 'AEIS', 'AGYS', 'AIMC', 'ALEX', 'ALGN', 'ALGT',
  'AMRC', 'AMSC', 'AMWD', 'ANGI', 'ANIP', 'APEI', 'APOG', 'ARCB',
  'ARGO', 'AROC', 'ARWR', 'ATEC', 'ATGE', 'ATLC', 'ATNI', 'AVAV',
  'AVID', 'AXGN', 'AY', 'AZPN', 'BANF', 'BCO', 'BECN', 'BJRI',
  'BKNG', 'BLD', 'BLDR', 'BLX', 'BMI', 'BRP', 'BRSP', 'CAKE',
  'CALM', 'CASY', 'CBZ', 'CDNA', 'CFX', 'CGNX', 'CHCO', 'CHE',
  'CHTR', 'CINF', 'CIR', 'CLAR', 'CLBK', 'CLSK', 'CMCO', 'CMT',
  'COHU', 'COLM', 'CPSI', 'CRAI', 'CRI', 'CSL', 'CSOD', 'CVCO',
  'CVLT', 'CWST', 'CYRX', 'CZR', 'DAN', 'DENN', 'DGII', 'DHC',
  'DIOD', 'DLB', 'DNKN', 'DOOR', 'DY', 'ECHO', 'EEFT', 'EGBN',
  'EHTH', 'EIGI', 'ENSG', 'ENVA', 'EQH', 'ESE', 'ESGR', 'ETON',
  'EVTV', 'EXLS', 'EXPO', 'FA', 'FARO', 'FCFS', 'FCN', 'FFIV',
  'FHN', 'FIGS', 'FLGT', 'FLO', 'FLWS', 'FMAO', 'FN', 'FNKO',
  'FNV', 'FOXF', 'FRO', 'FROG', 'FRPH', 'FRSH', 'FTI', 'FTNT',
  'FWRD', 'GBX', 'GCT', 'GDOT', 'GFF', 'GLBE', 'GLDD', 'GLNG',
  'GLOB', 'GLPI', 'GLW', 'GNTX', 'GO', 'GRBK', 'GRFS', 'GSHD',
  'GTBIF', 'GTX', 'GVA', 'HA', 'HAIN', 'HBB', 'HBNC', 'HEES',
  'HGV', 'HLNE', 'HLX', 'HMN', 'HMST', 'HNI', 'HRMY', 'HSC',
  'HTLD', 'HUBG', 'HURN', 'HWC', 'HWKN', 'HZNP', 'IAA', 'IART',
  'ICAD', 'ICFI', 'ICUI', 'IDYA', 'IEP', 'IGT', 'IIIN', 'IIIV',
  'IMXI', 'INGN', 'INMD', 'INST', 'INT', 'IOSP', 'IPAR', 'IRBT',
  'ISBC', 'ISSC', 'ITRI', 'IVA', 'JBSS', 'JBTX', 'JBT', 'JCOM',
  'JJSF', 'JKHY', 'JNPR', 'JOE', 'JRVR', 'JTPY', 'JW.A', 'KALU',
  'KAMN', 'KBAL', 'KELYA', 'KEQU', 'KFRC', 'KIDS', 'KLXE', 'KMDA',
  'KODK', 'KTOS', 'KURA', 'LAMR', 'LAUR', 'LAWS', 'LBC', 'LDI',
  'LFST', 'LGIH', 'LGND', 'LIVN', 'LKFN', 'LLNW', 'LMAT', 'LNDC',
  'LNTH', 'LOB', 'LOGI', 'LPRO', 'LQDA', 'LRCX', 'LSCC', 'LUNA',
  'LXRX', 'MANH', 'MATW', 'MAXN', 'MBUU', 'MBWM', 'MCBC', 'MCRI',
  'MDRX', 'MEDS', 'MESA', 'MGEE', 'MGPI', 'MGRC', 'MIDD', 'MKSI',
  'MLCO', 'MMSI', 'MNTV', 'MOD', 'MODV', 'MOGO', 'MORF', 'MORN',
  'MPWR', 'MRCY', 'MRSN', 'MRUS', 'MSEX', 'MSGS', 'MTLS', 'MTX',
  'NARI', 'NATR', 'NAVI', 'NBEV', 'NBTB', 'NCMI', 'NDSN', 'NEO',
  'NEOG', 'NGVC', 'NINE', 'NMIH', 'NMRK', 'NNBR', 'NOVN', 'NPTN',
  'NRDS', 'NSIT', 'NSTG', 'NTCT', 'NTRA', 'NUVA', 'NVCR', 'NVT',
  'NVTR', 'NWPX', 'NWS', 'NWSA', 'NX', 'NXGN', 'OABI', 'OAS',
  'OCFC', 'OCGN', 'ODP', 'OFIX', 'OFLX', 'OGS', 'OMCL', 'OMER',
  'ONB', 'OPCH', 'OPI', 'ORBC', 'ORIC', 'OSG', 'OSUR', 'OTTR',
  'ATRO', 'OVBC', 'OVID', 'PACB', 'PAGS', 'PATI', 'PATK', 'PAYA',
  'PAYS', 'PBCT', 'PBH', 'PBYI', 'PCTY', 'PDCE', 'PDFS', 'PEGA',
  'PENN', 'PETQ', 'PFG', 'PFGC', 'PGEN', 'PGNY', 'PINC', 'PKE',
  'PLAB', 'PLAY', 'PLBY', 'PLCE', 'PLUS', 'PMVP', 'PNRG', 'PNTG',
  'POWI', 'PPBI', 'PPC', 'PRAA', 'PRFT', 'PRGS', 'PRMW', 'PROS',
  'PRSC', 'PRVB', 'PSFE', 'PSMT', 'PSN', 'PSTL', 'PTGX', 'PUBM',
  'PXLW', 'QDEL', 'QLYS', 'QRTEA', 'QTRX', 'QTWO', 'QUIK', 'RAMP',
  'RAPT', 'RARE', 'RCII', 'RCKT', 'RCUS', 'RDNT', 'RDUS', 'RDVT',
  'REGI', 'REGN', 'RELL', 'REPH', 'REPL', 'RETO', 'REVG', 'RGC',
  'RGLD', 'RICK', 'RIGL', 'RIVE', 'RMBS', 'RNET', 'RNR', 'ROCC',
  'ROCK', 'ROG', 'ROLL', 'RPAY', 'RPRX', 'RRX', 'RSSS', 'RTLR',
  'RTRX', 'RUBY', 'RUSHA', 'RUSHB', 'RUTH', 'RVMD', 'RVNC', 'RVPH',
  'RYAM', 'SAIL', 'SAM', 'SANA', 'SANM', 'SBCF', 'SBFG', 'SBGI',
  'SBRA', 'SCHL', 'SCHN', 'SCOR', 'SCSC', 'SCWX', 'SDGR', 'SEAT',
  'SENEA', 'SFBS', 'SFNC', 'SGMO', 'SGMS', 'SHBI', 'SHEN', 'SHIP',
  'SHLS', 'SHOO', 'SHV', 'SIBN', 'SIG', 'SILC', 'SILK', 'SIM',
  'SITC', 'SIVB', 'SJW', 'SKIN', 'SKWD', 'SKYW', 'SLAB', 'SLDB',
  'SLP', 'SLQT', 'SMBC', 'SMID', 'SMMT', 'SMPL', 'SMSI', 'SMTX',
  'SNCR', 'SNDX', 'SNV', 'SNWV', 'SONM', 'SP', 'SPCB', 'SPFI',
  'SPNE', 'SPNT', 'SPOK', 'SPOT', 'SPRO', 'SPSC', 'SPTN', 'SPWH',
  'SPXC', 'SRCE', 'SRDX', 'SREV', 'SRNE', 'SSB', 'SSRM', 'SSTI',
  'SSTK', 'STAG', 'STBA', 'STFC', 'STLD', 'STMP', 'STNG', 'STOK',
  'STRA', 'STRL', 'STRS', 'STXS', 'SUPN', 'SUSC', 'SVRA', 'SWAV',
  'SWTX', 'SYBX', 'SYBT', 'SYNA', 'SYNC', 'SYNH', 'SYNL', 'TACO',
  'TBBK', 'TBI', 'TCBI', 'TCBK', 'TCMD', 'TDOC', 'TECH', 'TELL',
  'TENB', 'TEN', 'TERN', 'TESS', 'TFII', 'TGNA', 'TH', 'THRY',
  'TILE', 'TITN', 'TLND', 'TLYS', 'TMDX', 'TMUS', 'TNAV', 'TNDM',
  'TNXP', 'TOPS', 'TPHS', 'TPTX', 'TR', 'TRDA', 'TRIB', 'TRHC',
  'TRIP', 'TRM', 'TRMB', 'TRNO', 'TROW', 'TRS', 'TRUE', 'TRVN',
  'TTGT', 'TTM', 'TTWO', 'TWNK', 'TXG', 'TXMD', 'TXRH', 'UCBI',
  'UCTT', 'UEIC', 'UFCS', 'UFPI', 'UFPT', 'UG', 'UHAL', 'UHT',
  'UIHC', 'ULH', 'ULTA', 'UMBF', 'UNIT', 'UNTY', 'UPLD', 'URGN',
  'USAK', 'USAP', 'USAU', 'USCR', 'USIO', 'USNA', 'USPH', 'UTMD',
  'VBF', 'VCRA', 'VCYT', 'VECO', 'VEON', 'VERA', 'VERI', 'VERU',
  'VIAV', 'VICR', 'VIE', 'VIEW', 'VINC', 'VIR', 'VIRC', 'VIRI',
  'VIS', 'VITL', 'VIVO', 'VKTX', 'VLDR', 'VLY', 'VMEO', 'VNCE',
  'VNDA', 'VNE', 'VNET', 'VOXX', 'VOYA', 'VRA', 'VRRM', 'VRSK',
  'VRTS', 'VSAT', 'VSEC', 'VSH', 'VSTM', 'VTS', 'VTVT', 'VXRT',
  'WAFD', 'WASH', 'WATT', 'WBS', 'WDAY', 'WDC', 'WDFC', 'WELL',
  'WETF', 'WEYS', 'WHF', 'WIX', 'WKHS', 'WKSP', 'WLDN', 'WLK',
  'WMK', 'WNEB', 'WOR', 'WPRT', 'WRAP', 'WRBY', 'WRLD', 'WSBC',
  'WSBF', 'WSC', 'WSTG', 'WTBA', 'WTRG', 'WVVI', 'WWD', 'WWW',
  'XBIT', 'XELA', 'XENE', 'XERS', 'XLNX', 'XNCR', 'XNET', 'XOG',
  'XOMA', 'XONE', 'XPEL', 'XPER', 'XRAY', 'YGTY', 'YMAB', 'YORW',
  'YRCW', 'YSG', 'YY', 'ZBRA', 'ZEAL', 'ZEUS', 'ZIMV', 'ZION',
  'ZIXI', 'ZLAB', 'ZNTL', 'ZS', 'ZTO', 'ZUMZ', 'ZVO',

  // === Real Estate & REITs ===
  'REXR', 'COLD', 'IIPR', 'ADC', 'AHH', 'AIRC', 'ALEX', 'APLE',
  'BDN', 'BNL', 'BRX', 'BXP', 'CIO', 'CLPR', 'CMCT', 'CTRE',
  'CUBE', 'CUZ', 'DEA', 'DEI', 'DGRW', 'DHC', 'DOC', 'EGP',
  'ELME', 'EPR', 'ESRT', 'FAT', 'FCPT', 'FPI', 'FR', 'FSP',
  'GNL', 'GOOD', 'GPMT', 'GTY', 'HT', 'ILPT', 'INN', 'IRT',
  'IIPR', 'JBGS', 'KRC', 'LAND', 'LTC', 'MAC', 'MDRR', 'MFA',
  'MGP', 'MPW', 'NHI', 'NNN', 'NSA', 'NXRT', 'NYT', 'OFC',
  'OFFS', 'OHI', 'OUT', 'PGRE', 'PK', 'PLYM', 'PSTL', 'QTS',
  'RC', 'RLGT', 'RLJ', 'RYN', 'SAFE', 'SBRA', 'SKT', 'SLG',
  'SNDE', 'SRC', 'STAG', 'STAR', 'STOR', 'SUI', 'SVC', 'TRNO',
  'TRTX', 'UBFO', 'UBA', 'UE', 'UNIT', 'VER', 'VICI', 'VNO',
  'VRE', 'VSTA', 'WPC', 'WRI', 'WTRE', 'XHR',
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

  // NASDAQ Additional - Growth Stocks
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
  NTES: { name: 'NetEase Inc.', category: 'Technology' },
  TCOM: { name: 'Trip.com Group', category: 'Consumer Cyclical' },

  // NASDAQ Growth & Fintech
  SOFI: { name: 'SoFi Technologies', category: 'Financial' },
  UPST: { name: 'Upstart Holdings', category: 'Financial' },
  AFRM: { name: 'Affirm Holdings', category: 'Financial' },
  PATH: { name: 'UiPath', category: 'Technology' },
  SNOW: { name: 'Snowflake Inc.', category: 'Technology' },
  DKNG: { name: 'DraftKings', category: 'Consumer Cyclical' },
  RBLX: { name: 'Roblox Corporation', category: 'Technology' },
  U: { name: 'Unity Software', category: 'Technology' },
  BILL: { name: 'Bill.com Holdings', category: 'Technology' },
  HUBS: { name: 'HubSpot Inc.', category: 'Technology' },
  TWLO: { name: 'Twilio Inc.', category: 'Technology' },
  MDB: { name: 'MongoDB Inc.', category: 'Technology' },
  CFLT: { name: 'Confluent Inc.', category: 'Technology' },
  GTLB: { name: 'GitLab Inc.', category: 'Technology' },
  S: { name: 'SentinelOne', category: 'Technology' },
  DUOL: { name: 'Duolingo Inc.', category: 'Technology' },
  PINS: { name: 'Pinterest Inc.', category: 'Technology' },
  SNAP: { name: 'Snap Inc.', category: 'Technology' },
  SPOT: { name: 'Spotify Technology', category: 'Communication Services' },
  LYFT: { name: 'Lyft Inc.', category: 'Technology' },
  GRAB: { name: 'Grab Holdings', category: 'Technology' },
  SE: { name: 'Sea Limited', category: 'Consumer Cyclical' },
  SHOP: { name: 'Shopify Inc.', category: 'Technology' },
  SQ: { name: 'Block Inc.', category: 'Financial' },
  FUBO: { name: 'fuboTV Inc.', category: 'Communication Services' },

  // NASDAQ Biotech
  MRNA: { name: 'Moderna Inc.', category: 'Healthcare' },
  BNTX: { name: 'BioNTech SE', category: 'Healthcare' },
  NVAX: { name: 'Novavax Inc.', category: 'Healthcare' },
  SGEN: { name: 'Seagen Inc.', category: 'Healthcare' },
  EXAS: { name: 'Exact Sciences', category: 'Healthcare' },
  ALNY: { name: 'Alnylam Pharmaceuticals', category: 'Healthcare' },
  SRPT: { name: 'Sarepta Therapeutics', category: 'Healthcare' },
  RARE: { name: 'Ultragenyx Pharmaceutical', category: 'Healthcare' },
  BMRN: { name: 'BioMarin Pharmaceutical', category: 'Healthcare' },
  NBIX: { name: 'Neurocrine Biosciences', category: 'Healthcare' },
  UTHR: { name: 'United Therapeutics', category: 'Healthcare' },
  INCY: { name: 'Incyte Corporation', category: 'Healthcare' },
  IONS: { name: 'Ionis Pharmaceuticals', category: 'Healthcare' },
  HALO: { name: 'Halozyme Therapeutics', category: 'Healthcare' },
  LEGN: { name: 'Legend Biotech', category: 'Healthcare' },
  PCVX: { name: 'Vaxcyte Inc.', category: 'Healthcare' },
  KRYS: { name: 'Krystal Biotech', category: 'Healthcare' },

  // NASDAQ Tech & AI
  ARM: { name: 'ARM Holdings', category: 'Technology' },
  SMCI: { name: 'Super Micro Computer', category: 'Technology' },
  IONQ: { name: 'IonQ Inc.', category: 'Technology' },
  RGTI: { name: 'Rigetti Computing', category: 'Technology' },
  AI: { name: 'C3.ai Inc.', category: 'Technology' },
  SOUN: { name: 'SoundHound AI', category: 'Technology' },
  BBAI: { name: 'BigBear.ai Holdings', category: 'Technology' },
  UPWK: { name: 'Upwork Inc.', category: 'Technology' },
  FVRR: { name: 'Fiverr International', category: 'Technology' },
  WIX: { name: 'Wix.com Ltd.', category: 'Technology' },
  ZI: { name: 'ZoomInfo Technologies', category: 'Technology' },
  ESTC: { name: 'Elastic N.V.', category: 'Technology' },
  NEWR: { name: 'New Relic Inc.', category: 'Technology' },
  ASAN: { name: 'Asana Inc.', category: 'Technology' },
  MNDY: { name: 'Monday.com Ltd.', category: 'Technology' },
  DOCN: { name: 'DigitalOcean Holdings', category: 'Technology' },
  FSLY: { name: 'Fastly Inc.', category: 'Technology' },
  AKAM: { name: 'Akamai Technologies', category: 'Technology' },

  // NASDAQ Consumer & Retail
  LULU: { name: 'Lululemon Athletica', category: 'Consumer Cyclical' },
  ROST: { name: 'Ross Stores', category: 'Consumer Cyclical' },
  DLTR: { name: 'Dollar Tree Inc.', category: 'Consumer Defensive' },
  DG: { name: 'Dollar General', category: 'Consumer Defensive' },
  FIVE: { name: 'Five Below Inc.', category: 'Consumer Cyclical' },
  OLLI: { name: "Ollie's Bargain Outlet", category: 'Consumer Cyclical' },
  TSCO: { name: 'Tractor Supply Co.', category: 'Consumer Cyclical' },
  WSM: { name: 'Williams-Sonoma', category: 'Consumer Cyclical' },
  RH: { name: 'Restoration Hardware', category: 'Consumer Cyclical' },
  ETSY: { name: 'Etsy Inc.', category: 'Consumer Cyclical' },
  W: { name: 'Wayfair Inc.', category: 'Consumer Cyclical' },
  CHWY: { name: 'Chewy Inc.', category: 'Consumer Cyclical' },
  CVNA: { name: 'Carvana Co.', category: 'Consumer Cyclical' },
  CPNG: { name: 'Coupang Inc.', category: 'Consumer Cyclical' },
  BABA: { name: 'Alibaba Group', category: 'Consumer Cyclical' },

  // NASDAQ EV & Clean Energy
  NIO: { name: 'NIO Inc.', category: 'Consumer Cyclical' },
  XPEV: { name: 'XPeng Inc.', category: 'Consumer Cyclical' },
  LI: { name: 'Li Auto Inc.', category: 'Consumer Cyclical' },
  FSR: { name: 'Fisker Inc.', category: 'Consumer Cyclical' },
  GOEV: { name: 'Canoo Inc.', category: 'Consumer Cyclical' },
  WKHS: { name: 'Workhorse Group', category: 'Industrial' },
  HYLN: { name: 'Hyliion Holdings', category: 'Industrial' },
  CHPT: { name: 'ChargePoint Holdings', category: 'Industrial' },
  BLNK: { name: 'Blink Charging', category: 'Industrial' },
  EVGO: { name: 'EVgo Inc.', category: 'Industrial' },
  QS: { name: 'QuantumScape Corp.', category: 'Technology' },
  PLUG: { name: 'Plug Power Inc.', category: 'Industrial' },
  FCEL: { name: 'FuelCell Energy', category: 'Industrial' },
  BE: { name: 'Bloom Energy Corp.', category: 'Industrial' },
  SEDG: { name: 'SolarEdge Technologies', category: 'Technology' },
  RUN: { name: 'Sunrun Inc.', category: 'Industrial' },

  // NASDAQ Media & Entertainment
  PARA: { name: 'Paramount Global', category: 'Communication Services' },
  WBD: { name: 'Warner Bros Discovery', category: 'Communication Services' },
  LYV: { name: 'Live Nation Entertainment', category: 'Communication Services' },
  MTCH: { name: 'Match Group', category: 'Communication Services' },
  BMBL: { name: 'Bumble Inc.', category: 'Communication Services' },
  TTWO: { name: 'Take-Two Interactive', category: 'Communication Services' },
  EA: { name: 'Electronic Arts', category: 'Communication Services' },

  // NASDAQ Communications
  LUMN: { name: 'Lumen Technologies', category: 'Communication Services' },
  FYBR: { name: 'Frontier Communications', category: 'Communication Services' },
  USM: { name: 'United States Cellular', category: 'Communication Services' },
  SATS: { name: 'EchoStar Corporation', category: 'Communication Services' },
  GSAT: { name: 'Globalstar Inc.', category: 'Communication Services' },
  IRDM: { name: 'Iridium Communications', category: 'Communication Services' },

  // NASDAQ Transportation
  ODFL: { name: 'Old Dominion Freight', category: 'Industrial' },
  SAIA: { name: 'Saia Inc.', category: 'Industrial' },
  XPO: { name: 'XPO Logistics', category: 'Industrial' },
  JBHT: { name: 'J.B. Hunt Transport', category: 'Industrial' },
  CHRW: { name: 'C.H. Robinson', category: 'Industrial' },
  EXPD: { name: 'Expeditors International', category: 'Industrial' },
  LSTR: { name: 'Landstar System', category: 'Industrial' },
  WERN: { name: 'Werner Enterprises', category: 'Industrial' },
  KNX: { name: 'Knight-Swift Transportation', category: 'Industrial' },
  SNDR: { name: 'Schneider National', category: 'Industrial' },

  // NASDAQ REITs
  DLR: { name: 'Digital Realty Trust', category: 'Real Estate' },
  SBAC: { name: 'SBA Communications', category: 'Real Estate' },
  CCI: { name: 'Crown Castle', category: 'Real Estate' },
  REXR: { name: 'Rexford Industrial', category: 'Real Estate' },
  COLD: { name: 'Americold Realty', category: 'Real Estate' },
  IIPR: { name: 'Innovative Industrial Properties', category: 'Real Estate' },

  // NASDAQ Financial
  MSTR: { name: 'MicroStrategy', category: 'Technology' },
  IBKR: { name: 'Interactive Brokers', category: 'Financial' },
  VIRT: { name: 'Virtu Financial', category: 'Financial' },
  NDAQ: { name: 'Nasdaq Inc.', category: 'Financial' },
  LPLA: { name: 'LPL Financial', category: 'Financial' },

  // Additional NASDAQ Biotech
  NTLA: { name: 'Intellia Therapeutics', category: 'Healthcare' },
  EDIT: { name: 'Editas Medicine', category: 'Healthcare' },
  BEAM: { name: 'Beam Therapeutics', category: 'Healthcare' },
  ARWR: { name: 'Arrowhead Research', category: 'Healthcare' },
  BGNE: { name: 'BeiGene Ltd.', category: 'Healthcare' },
  JAZZ: { name: 'Jazz Pharmaceuticals', category: 'Healthcare' },
  EXEL: { name: 'Exelixis Inc.', category: 'Healthcare' },
  IOVA: { name: 'Iovance Biotherapeutics', category: 'Healthcare' },
  SAGE: { name: 'Sage Therapeutics', category: 'Healthcare' },
  ACAD: { name: 'Acadia Pharmaceuticals', category: 'Healthcare' },

  // Additional Tech & SaaS
  SPLK: { name: 'Splunk Inc.', category: 'Technology' },
  DBX: { name: 'Dropbox Inc.', category: 'Technology' },
  BOX: { name: 'Box Inc.', category: 'Technology' },
  COUP: { name: 'Coupa Software', category: 'Technology' },
  QLYS: { name: 'Qualys Inc.', category: 'Technology' },
  TENB: { name: 'Tenable Holdings', category: 'Technology' },
  VRNS: { name: 'Varonis Systems', category: 'Technology' },
  RPD: { name: 'Rapid7 Inc.', category: 'Technology' },
  NTNX: { name: 'Nutanix Inc.', category: 'Technology' },
  MANH: { name: 'Manhattan Associates', category: 'Technology' },
  PEGA: { name: 'Pegasystems Inc.', category: 'Technology' },
  PLAN: { name: 'Anaplan Inc.', category: 'Technology' },
  TOST: { name: 'Toast Inc.', category: 'Technology' },
  BRZE: { name: 'Braze Inc.', category: 'Technology' },
  JAMF: { name: 'Jamf Holding', category: 'Technology' },

  // Additional Semiconductors
  WOLF: { name: 'Wolfspeed Inc.', category: 'Technology' },
  CRUS: { name: 'Cirrus Logic', category: 'Technology' },
  DIOD: { name: 'Diodes Inc.', category: 'Technology' },
  MKSI: { name: 'MKS Instruments', category: 'Technology' },
  OLED: { name: 'Universal Display', category: 'Technology' },
  ONTO: { name: 'Onto Innovation', category: 'Technology' },
  POWI: { name: 'Power Integrations', category: 'Technology' },
  QRVO: { name: 'Qorvo Inc.', category: 'Technology' },
  RMBS: { name: 'Rambus Inc.', category: 'Technology' },
  SLAB: { name: 'Silicon Labs', category: 'Technology' },

  // Additional EV & Clean Tech
  ARRY: { name: 'Array Technologies', category: 'Industrial' },
  BLDP: { name: 'Ballard Power', category: 'Industrial' },
  GEVO: { name: 'Gevo Inc.', category: 'Industrial' },
  STEM: { name: 'Stem Inc.', category: 'Technology' },
  LAZR: { name: 'Luminar Technologies', category: 'Technology' },
  NKLA: { name: 'Nikola Corporation', category: 'Consumer Cyclical' },

  // Additional Consumer
  ONON: { name: 'On Holding AG', category: 'Consumer Cyclical' },
  PTON: { name: 'Peloton Interactive', category: 'Consumer Cyclical' },
  SHAK: { name: 'Shake Shack', category: 'Consumer Cyclical' },
  WING: { name: 'Wingstop Inc.', category: 'Consumer Cyclical' },
  TXRH: { name: 'Texas Roadhouse', category: 'Consumer Cyclical' },
  ELF: { name: 'e.l.f. Beauty', category: 'Consumer Cyclical' },
  CROX: { name: 'Crocs Inc.', category: 'Consumer Cyclical' },
  YETI: { name: 'YETI Holdings', category: 'Consumer Cyclical' },
  BROS: { name: 'Dutch Bros Inc.', category: 'Consumer Cyclical' },

  // Additional Fintech
  LMND: { name: 'Lemonade Inc.', category: 'Financial' },
  RKT: { name: 'Rocket Companies', category: 'Financial' },
  LC: { name: 'LendingClub Corp', category: 'Financial' },
  ALLY: { name: 'Ally Financial', category: 'Financial' },
  FCNCA: { name: 'First Citizens Bank', category: 'Financial' },
  WAL: { name: 'Western Alliance', category: 'Financial' },

  // Additional Media & Gaming
  MARA: { name: 'Marathon Digital', category: 'Technology' },
  RIOT: { name: 'Riot Platforms', category: 'Technology' },
  WMG: { name: 'Warner Music Group', category: 'Communication Services' },
  SONO: { name: 'Sonos Inc.', category: 'Technology' },
  IMAX: { name: 'IMAX Corporation', category: 'Communication Services' },

  // Additional Industrial
  ZBRA: { name: 'Zebra Technologies', category: 'Technology' },
  LOGI: { name: 'Logitech International', category: 'Technology' },
  IRBT: { name: 'iRobot Corporation', category: 'Consumer Cyclical' },
  GNRC: { name: 'Generac Holdings', category: 'Industrial' },
  AVAV: { name: 'AeroVironment Inc.', category: 'Industrial' },
  KTOS: { name: 'Kratos Defense', category: 'Industrial' },
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
