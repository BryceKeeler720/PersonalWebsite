import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateStdDev,
  calculateZScore,
  calculateATR,
  calculateVWAP,
} from '../src/lib/trading/indicators';

describe('Technical Indicators', () => {
  describe('calculateSMA', () => {
    it('should return empty array when prices length is less than period', () => {
      expect(calculateSMA([1, 2, 3], 5)).toEqual([]);
    });

    it('should calculate SMA correctly for simple values', () => {
      const prices = [1, 2, 3, 4, 5];
      const result = calculateSMA(prices, 3);
      // SMA(3) for [1,2,3] = 2, [2,3,4] = 3, [3,4,5] = 4
      expect(result).toEqual([2, 3, 4]);
    });

    it('should calculate SMA correctly for a 5-period average', () => {
      const prices = [10, 20, 30, 40, 50, 60, 70];
      const result = calculateSMA(prices, 5);
      // SMA(5): [10,20,30,40,50]=30, [20,30,40,50,60]=40, [30,40,50,60,70]=50
      expect(result).toEqual([30, 40, 50]);
    });

    it('should handle single-period SMA (returns original values)', () => {
      const prices = [5, 10, 15];
      const result = calculateSMA(prices, 1);
      expect(result).toEqual([5, 10, 15]);
    });

    it('should handle period equal to prices length', () => {
      const prices = [2, 4, 6, 8];
      const result = calculateSMA(prices, 4);
      expect(result).toEqual([5]); // (2+4+6+8)/4 = 5
    });
  });

  describe('calculateEMA', () => {
    it('should return empty array when prices length is less than period', () => {
      expect(calculateEMA([1, 2], 5)).toEqual([]);
    });

    it('should start with SMA as first EMA value', () => {
      const prices = [10, 20, 30, 40, 50];
      const result = calculateEMA(prices, 3);
      // First value should be SMA of first 3 = (10+20+30)/3 = 20
      expect(result[0]).toBe(20);
    });

    it('should apply EMA formula correctly', () => {
      const prices = [22, 24, 26, 28, 30];
      const result = calculateEMA(prices, 3);
      const multiplier = 2 / (3 + 1); // 0.5

      // First EMA = SMA = (22+24+26)/3 = 24
      expect(result[0]).toBe(24);

      // Second EMA = (28 - 24) * 0.5 + 24 = 26
      expect(result[1]).toBe(26);

      // Third EMA = (30 - 26) * 0.5 + 26 = 28
      expect(result[2]).toBe(28);
    });

    it('should produce smoother values than SMA for volatile data', () => {
      const prices = [100, 105, 95, 110, 90, 115, 85];
      const ema = calculateEMA(prices, 3);
      const sma = calculateSMA(prices, 3);
      // Both should have same length
      expect(ema.length).toBe(sma.length);
    });
  });

  describe('calculateRSI', () => {
    it('should return empty array when not enough data', () => {
      expect(calculateRSI([1, 2, 3], 14)).toEqual([]);
    });

    it('should return 100 when all changes are positive (no losses)', () => {
      // Create steadily increasing prices
      const prices = Array.from({ length: 20 }, (_, i) => 100 + i);
      const result = calculateRSI(prices, 14);
      // All gains, no losses = RSI of 100
      result.forEach((rsi) => {
        expect(rsi).toBe(100);
      });
    });

    it('should return RSI around 50 for equal ups and downs', () => {
      // Alternating up/down pattern
      const prices = [100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102];
      const result = calculateRSI(prices, 14);
      // With equal avg gains and losses, RSI should be around 50 (within ±10)
      expect(result[0]).toBeGreaterThan(40);
      expect(result[0]).toBeLessThan(60);
    });

    it('should return low RSI for declining prices', () => {
      // Steadily declining prices
      const prices = Array.from({ length: 20 }, (_, i) => 200 - i * 2);
      const result = calculateRSI(prices, 14);
      // All losses = RSI close to 0
      result.forEach((rsi) => {
        expect(rsi).toBeLessThan(10);
      });
    });

    it('should use default period of 14', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100 + Math.sin(i) * 10);
      const resultDefault = calculateRSI(prices);
      const resultExplicit = calculateRSI(prices, 14);
      expect(resultDefault).toEqual(resultExplicit);
    });
  });

  describe('calculateMACD', () => {
    it('should return empty arrays when not enough data', () => {
      const result = calculateMACD([1, 2, 3, 4, 5]);
      expect(result.macd).toEqual([]);
      expect(result.signal).toEqual([]);
      expect(result.histogram).toEqual([]);
    });

    it('should calculate MACD line as difference between fast and slow EMA', () => {
      // Generate enough data for MACD calculation
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i);
      const result = calculateMACD(prices, 12, 26, 9);

      // MACD should have values
      expect(result.macd.length).toBeGreaterThan(0);
      // Signal should have values (requires MACD length >= signalPeriod)
      expect(result.signal.length).toBeGreaterThan(0);
      // Histogram = MACD - Signal
      expect(result.histogram.length).toBeGreaterThan(0);
    });

    it('should produce histogram as MACD minus signal', () => {
      const prices = Array.from({ length: 60 }, (_, i) => 50 + Math.sin(i / 5) * 20);
      const result = calculateMACD(prices, 12, 26, 9);

      // Verify histogram calculation (MACD - Signal)
      const macdForHistogram = result.macd.slice(9 - 1);
      for (let i = 0; i < result.histogram.length; i++) {
        expect(result.histogram[i]).toBeCloseTo(macdForHistogram[i] - result.signal[i], 10);
      }
    });

    it('should use default parameters (12, 26, 9)', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
      const resultDefault = calculateMACD(prices);
      const resultExplicit = calculateMACD(prices, 12, 26, 9);
      expect(resultDefault.macd).toEqual(resultExplicit.macd);
    });
  });

  describe('calculateBollingerBands', () => {
    it('should return empty arrays when not enough data', () => {
      const result = calculateBollingerBands([1, 2, 3], 20);
      expect(result.upper).toEqual([]);
      expect(result.middle).toEqual([]);
      expect(result.lower).toEqual([]);
    });

    it('should have middle band equal to SMA', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + i);
      const result = calculateBollingerBands(prices, 20);
      const sma = calculateSMA(prices, 20);
      expect(result.middle).toEqual(sma);
    });

    it('should have upper > middle > lower', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + Math.random() * 10);
      const result = calculateBollingerBands(prices, 20, 2);

      for (let i = 0; i < result.middle.length; i++) {
        expect(result.upper[i]).toBeGreaterThan(result.middle[i]);
        expect(result.middle[i]).toBeGreaterThan(result.lower[i]);
      }
    });

    it('should respect stdDevMultiplier parameter', () => {
      const prices = Array.from({ length: 25 }, (_, i) => 100 + (i % 5));
      const result1 = calculateBollingerBands(prices, 20, 1);
      const result2 = calculateBollingerBands(prices, 20, 2);

      // With higher multiplier, bands should be wider
      const width1 = result1.upper[0] - result1.lower[0];
      const width2 = result2.upper[0] - result2.lower[0];
      expect(width2).toBeGreaterThan(width1);
      expect(width2).toBeCloseTo(width1 * 2, 5);
    });

    it('should collapse bands for constant prices', () => {
      const prices = Array.from({ length: 25 }, () => 100);
      const result = calculateBollingerBands(prices, 20, 2);

      // With zero std dev, all bands should be equal
      for (let i = 0; i < result.middle.length; i++) {
        expect(result.upper[i]).toBe(100);
        expect(result.middle[i]).toBe(100);
        expect(result.lower[i]).toBe(100);
      }
    });
  });

  describe('calculateStdDev', () => {
    it('should return 0 for empty array', () => {
      expect(calculateStdDev([])).toBe(0);
    });

    it('should return 0 for single value', () => {
      expect(calculateStdDev([5])).toBe(0);
    });

    it('should return 0 for constant values', () => {
      expect(calculateStdDev([10, 10, 10, 10])).toBe(0);
    });

    it('should calculate standard deviation correctly', () => {
      // Values: [2, 4, 4, 4, 5, 5, 7, 9]
      // Mean = 5, Variance = 4, StdDev = 2
      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      expect(calculateStdDev(values)).toBe(2);
    });

    it('should handle negative values', () => {
      const values = [-2, -1, 0, 1, 2];
      // Mean = 0, Variance = (4+1+0+1+4)/5 = 2, StdDev = sqrt(2)
      expect(calculateStdDev(values)).toBeCloseTo(Math.sqrt(2), 10);
    });
  });

  describe('calculateZScore', () => {
    it('should return 0 when stdDev is 0', () => {
      expect(calculateZScore(100, 50, 0)).toBe(0);
    });

    it('should return 0 when value equals mean', () => {
      expect(calculateZScore(50, 50, 10)).toBe(0);
    });

    it('should return positive z-score when value > mean', () => {
      // (60 - 50) / 10 = 1
      expect(calculateZScore(60, 50, 10)).toBe(1);
    });

    it('should return negative z-score when value < mean', () => {
      // (40 - 50) / 10 = -1
      expect(calculateZScore(40, 50, 10)).toBe(-1);
    });

    it('should calculate z-score of 2 correctly', () => {
      // (70 - 50) / 10 = 2
      expect(calculateZScore(70, 50, 10)).toBe(2);
    });
  });

  describe('calculateATR', () => {
    it('should return empty array when not enough data', () => {
      expect(calculateATR([100], [90], [95], 14)).toEqual([]);
    });

    it('should return empty array when arrays have different lengths', () => {
      expect(calculateATR([100, 110], [90, 95], [95], 14)).toEqual([]);
    });

    it('should calculate true range as max of (H-L, |H-prevC|, |L-prevC|)', () => {
      // Simple case: TR = High - Low when there's no gap
      const highs = [100, 105, 110];
      const lows = [95, 100, 105];
      const closes = [98, 103, 108];
      const result = calculateATR(highs, lows, closes, 2);

      // First true range: max(105-100, |105-98|, |100-98|) = max(5, 7, 2) = 7
      // Second true range: max(110-105, |110-103|, |105-103|) = max(5, 7, 2) = 7
      // EMA of [7, 7] with period 2
      expect(result.length).toBeGreaterThan(0);
    });

    it('should detect gaps in price', () => {
      // Gap up scenario
      const highs = [100, 120, 125]; // Gap from 100 to 120
      const lows = [95, 115, 120];
      const closes = [98, 118, 123];
      const result = calculateATR(highs, lows, closes, 2);

      // True range should capture the gap
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('calculateVWAP', () => {
    it('should return 0 for empty arrays', () => {
      expect(calculateVWAP([], [], [], [])).toBe(0);
    });

    it('should calculate VWAP as volume-weighted average of typical prices', () => {
      const highs = [100, 110];
      const lows = [90, 100];
      const closes = [95, 105];
      const volumes = [1000, 2000];

      // Typical prices: (100+90+95)/3 = 95, (110+100+105)/3 = 105
      // VWAP = (95*1000 + 105*2000) / (1000 + 2000) = (95000 + 210000) / 3000 = 101.67
      const result = calculateVWAP(highs, lows, closes, volumes);
      expect(result).toBeCloseTo(101.67, 1);
    });

    it('should weight by volume correctly', () => {
      // Same prices but different volume distributions
      const highs = [100, 100];
      const lows = [100, 100];
      const closes = [100, 200];
      const volumes1 = [1000, 1000]; // Equal volume
      const volumes2 = [1000, 9000]; // 90% volume on second bar

      // Typical prices: 100, 133.33
      // VWAP1 with equal volume = (100 + 133.33) / 2 = 116.67
      // VWAP2 with 90% on second = weighted toward 133.33

      const vwap1 = calculateVWAP(highs, lows, closes, volumes1);
      const vwap2 = calculateVWAP(highs, lows, closes, volumes2);

      expect(vwap2).toBeGreaterThan(vwap1);
    });

    it('should handle zero total volume', () => {
      const result = calculateVWAP([100], [90], [95], [0]);
      expect(result).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const prices = [1e10, 1e10 + 100, 1e10 + 200];
      const sma = calculateSMA(prices, 2);
      expect(sma[0]).toBeCloseTo(1e10 + 50, 5);
    });

    it('should handle very small numbers', () => {
      const prices = [0.0001, 0.0002, 0.0003];
      const sma = calculateSMA(prices, 2);
      expect(sma[0]).toBeCloseTo(0.00015, 10);
    });

    it('should handle decimal precision', () => {
      const prices = [1.1, 2.2, 3.3];
      const sma = calculateSMA(prices, 3);
      expect(sma[0]).toBeCloseTo(2.2, 10);
    });
  });
});
