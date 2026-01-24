const DEFAULT_CONFIG = {
  initialCapital: 1e4,
  maxPositionSize: 0.2,
  // 20% max per position
  maxPositions: 10,
  minTradeValue: 100,
  strategyWeights: {
    momentum: 0.3,
    meanReversion: 0.25,
    sentiment: 0.15,
    technical: 0.3
  },
  scheduleInterval: "daily"
};

export { DEFAULT_CONFIG as D };
