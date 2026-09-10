import { DEFAULT_CONFIG } from './types';
import type { LearningState } from './types';

const BOT_CONFIG = {
  buyThreshold: 0.02,
  riskPerTrade: 0.01,
  atrStopMultiplier: 2.5,
  atrProfit1Multiplier: 3,
  atrProfit2Multiplier: 5,
  maxNewPositionsPerCycle: 35,
  minHoldBars: 24,
  transactionCostBps: 5,
  tradeCooldownHours: 24,
  minStockPrice: 5,
  minSignalConfidence: 0.3,
};

const card: React.CSSProperties = {
  background: 'var(--void)',
  border: '1px solid var(--faint)',
  borderRadius: 0,
  padding: '1.5rem',
};

const cardTitle: React.CSSProperties = {
  fontSize: '0.9rem',
  fontWeight: 'normal',
  textTransform: 'uppercase',
  letterSpacing: '0.35ch',
  color: 'var(--bone)',
  margin: '0 0 1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px dashed var(--ghost)',
};

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.8rem',
  background: 'transparent',
  border: '1px solid var(--ghost)',
  padding: '0.75rem 1rem',
  borderRadius: 0,
  color: 'var(--ink)',
  lineHeight: 1.6,
  overflowX: 'auto',
};

const badge = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '0.2rem 0.6rem',
  borderRadius: 0,
  border: '1px solid currentcolor',
  fontSize: '0.75rem',
  fontWeight: 600,
  color,
  background: bg,
});

const subtext: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--ink)',
  lineHeight: 1.6,
  margin: '0.5rem 0',
};

function FlowDiagram() {
  const boxW = 120, boxH = 36, gap = 24;
  const steps = ['Market Data', 'Regime\nDetection', 'Strategy\nGroups', 'Signal\nCombination', 'Trade\nDecision'];
  const totalW = steps.length * boxW + (steps.length - 1) * gap;
  const colors = ['#6e6e6e', '#6e6e6e', '#6e6e6e', '#a8a8a8', '#d4d4d4'];

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <svg viewBox={`0 0 ${totalW} ${boxH + 10}`} width={totalW} height={boxH + 10} style={{ display: 'block', maxWidth: '100%' }}>
        {steps.map((label, i) => {
          const x = i * (boxW + gap);
          return (
            <g key={i}>
              <rect x={x} y={5} width={boxW} height={boxH} rx={0} fill="none" stroke={colors[i]} strokeWidth={1} />
              {label.split('\n').map((line, li) => (
                <text key={li} x={x + boxW / 2} y={5 + boxH / 2 + (li - (label.split('\n').length - 1) / 2) * 12} fill="#a8a8a8" fontSize={10} fontFamily="JetBrains Mono, monospace" textAnchor="middle" dominantBaseline="middle">
                  {line}
                </text>
              ))}
              {i < steps.length - 1 && (
                <polygon points={`${x + boxW + 4},${5 + boxH / 2} ${x + boxW + gap - 4},${5 + boxH / 2 - 4} ${x + boxW + gap - 4},${5 + boxH / 2 + 4}`} fill="#3a3a3a" />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ScoreBar({ label, value, maxLabel }: { label: string; value: string; maxLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px dashed var(--ghost)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--ink)', flex: 1 }}>{label}</span>
      <code style={{ fontSize: '0.8rem', color: 'var(--bone)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</code>
      {maxLabel && <span style={{ fontSize: '0.7rem', color: 'var(--dim)', marginLeft: '0.5rem' }}>{maxLabel}</span>}
    </div>
  );
}

function StrategyCard({ name, group, groupColor, indicators, scores, confidence }: {
  name: string;
  group: string;
  groupColor: string;
  indicators: string[];
  scores: { component: string; range: string }[];
  confidence: string;
}) {
  return (
    <div style={{ background: 'transparent', padding: '1.25rem', border: '1px solid var(--ghost)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--bone)' }}>{name}</h3>
        <span style={badge(groupColor, 'transparent')}>{group}</span>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indicators</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {indicators.map((ind, i) => (
            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', border: '1px solid var(--ghost)', color: 'var(--ink)' }}>
              {ind}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Components</div>
        {scores.map((s, i) => (
          <ScoreBar key={i} label={s.component} value={s.range} />
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--dim)', marginTop: '0.5rem' }}>
        Confidence: <span style={{ color: groupColor, fontWeight: 600 }}>{confidence}</span>
      </div>
    </div>
  );
}

const DEFAULT_REGIME_WEIGHTS: Record<string, { trend: number; reversion: number }> = {
  TRENDING_UP:   { trend: 0.80, reversion: 0.20 },
  TRENDING_DOWN: { trend: 0.80, reversion: 0.20 },
  RANGE_BOUND:   { trend: 0.20, reversion: 0.80 },
  UNKNOWN:       { trend: 0.50, reversion: 0.50 },
};

const PARAM_LABELS: Record<string, string> = {
  rsiOversold: 'RSI Oversold',
  rsiOverbought: 'RSI Overbought',
  smaShort: 'SMA Short Period',
  smaLong: 'SMA Long Period',
  bollingerStdDev: 'BB Std Dev',
  buyThreshold: 'Buy Threshold',
  atrStopMultiplier: 'ATR Stop Mult',
  atrProfit1Multiplier: 'ATR Profit1 Mult',
};

const PARAM_DEFAULTS: Record<string, number> = {
  rsiOversold: 30,
  rsiOverbought: 70,
  smaShort: 10,
  smaLong: 50,
  bollingerStdDev: 2.0,
  buyThreshold: 0.35,
  atrStopMultiplier: 2.0,
  atrProfit1Multiplier: 3.0,
};

function LearningSection({ learningState }: { learningState: LearningState | null }) {
  if (!learningState) {
    return (
      <div style={card}>
        <h2 style={cardTitle}>Self-Learning System</h2>
        <p style={{ ...subtext, textAlign: 'center', padding: '2rem 0' }}>
          Learning system not yet initialized. It will activate after the bot starts trading.
        </p>
      </div>
    );
  }

  const { totalTradesAnalyzed, warmupComplete, closedTrades, regimeWeights, params, paramHistory, weightHistory } = learningState;
  const warmupProgress = Math.min(100, (totalTradesAnalyzed / 50) * 100);
  const recentWins = closedTrades.filter(t => t.isWin).length;
  const winRate = closedTrades.length > 0 ? (recentWins / closedTrades.length * 100).toFixed(1) : '—';

  return (
    <>
      {/* Learning Status */}
      <div style={card}>
        <h2 style={cardTitle}>Self-Learning System</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '0.75rem', border: '1px solid var(--ghost)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.25rem' }}>Status</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: warmupComplete ? 'var(--color-positive)' : 'var(--ink)' }}>
              {warmupComplete ? 'Active' : 'Warming Up'}
            </div>
          </div>
          <div style={{ padding: '0.75rem', border: '1px solid var(--ghost)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.25rem' }}>Trades Analyzed</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--bone)' }}>{totalTradesAnalyzed}</div>
          </div>
          <div style={{ padding: '0.75rem', border: '1px solid var(--ghost)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.25rem' }}>Rolling Win Rate</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--bone)' }}>{winRate}%</div>
          </div>
          <div style={{ padding: '0.75rem', border: '1px solid var(--ghost)' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.25rem' }}>Rolling Window</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--bone)' }}>{closedTrades.length}/200</div>
          </div>
        </div>

        {!warmupComplete && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>Warmup Progress</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--ink)' }}>{totalTradesAnalyzed}/50 trades</span>
            </div>
            <div style={{ height: '6px', background: 'var(--ghost)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${warmupProgress}%`, background: 'var(--ink)', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--dim)', marginTop: '0.5rem' }}>
              Using default weights and parameters until 50 trades are completed.
            </p>
          </div>
        )}

        <p style={subtext}>
          The learning system adapts strategy weights and parameters based on trade outcomes.
          It uses a rolling window of the last 200 closed trades to compute per-regime accuracy
          and applies EMA smoothing (alpha=0.05) to prevent overfitting.
        </p>
      </div>

      {/* Adaptive Regime Weights */}
      <div style={card}>
        <h2 style={cardTitle}>Learned Regime Weights</h2>
        <p style={{ ...subtext, marginBottom: '1rem' }}>
          {warmupComplete
            ? 'Regime weights have been adapted based on observed strategy group accuracy per market regime.'
            : 'Weights below are defaults. They will begin adapting after warmup completes.'}
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--faint)' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Regime</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--bone)', fontWeight: 500 }}>Trend (Default)</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--bone)', fontWeight: 500 }}>Trend (Learned)</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Reversion (Learned)</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DEFAULT_REGIME_WEIGHTS).map(([regime, defaults]) => {
              const learned = regimeWeights[regime] || defaults;
              const delta = learned.trend - defaults.trend;
              const deltaColor = Math.abs(delta) < 0.005 ? 'var(--dim)' : delta > 0 ? 'var(--color-positive)' : 'var(--color-negative)';
              const regimeColors: Record<string, string> = {
                TRENDING_UP: 'var(--color-positive)', TRENDING_DOWN: 'var(--color-negative)',
                RANGE_BOUND: 'var(--ink)', UNKNOWN: 'var(--dim)',
              };
              return (
                <tr key={regime} style={{ borderBottom: '1px dashed var(--ghost)' }}>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{ color: regimeColors[regime] || 'var(--bone)', fontWeight: 600 }}>{regime}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--dim)' }}>{(defaults.trend * 100).toFixed(0)}%</td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--ink)', fontWeight: 600 }}>{(learned.trend * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--ink)', fontWeight: 600 }}>{(learned.reversion * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: deltaColor, fontWeight: 600 }}>
                    {delta > 0 ? '+' : ''}{(delta * 100).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {weightHistory.length > 0 && (
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--dim)' }}>
            Weight updates: {weightHistory.length} snapshots recorded
          </div>
        )}
      </div>

      {/* Tuned Parameters */}
      <div style={card}>
        <h2 style={cardTitle}>Learned Parameters</h2>
        <p style={{ ...subtext, marginBottom: '1rem' }}>
          Parameters are tuned via hill-climbing every 50 closed trades. One parameter is randomly
          selected and nudged in the direction that correlates with improving win rate.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--faint)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Parameter</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Default</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--ink)', fontWeight: 500 }}>Current</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(PARAM_DEFAULTS).map(([key, defaultVal]) => {
              const current = params[key] ?? defaultVal;
              const delta = current - defaultVal;
              const deltaColor = Math.abs(delta) < 0.001 ? 'var(--dim)' : delta > 0 ? 'var(--color-positive)' : 'var(--color-negative)';
              return (
                <tr key={key} style={{ borderBottom: '1px dashed var(--ghost)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--ink)' }}>{PARAM_LABELS[key] || key}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--dim)' }}>{defaultVal}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--bone)', fontWeight: 600 }}>{current}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: deltaColor, fontWeight: 600 }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recent Parameter Changes */}
      {paramHistory.length > 0 && (
        <div style={card}>
          <h2 style={cardTitle}>Recent Parameter Adjustments</h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {paramHistory.slice().reverse().slice(0, 10).map((change, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px dashed var(--ghost)', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{PARAM_LABELS[change.paramName] || change.paramName}</span>
                  <span style={{ color: 'var(--dim)', marginLeft: '0.5rem' }}>
                    {change.oldValue} → {change.newValue}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--dim)', fontSize: '0.7rem' }}>
                    WR: {(change.olderWinRate * 100).toFixed(0)}% → {(change.newerWinRate * 100).toFixed(0)}%
                  </span>
                  <span style={{ color: 'var(--dim)', fontSize: '0.7rem', marginLeft: '0.75rem' }}>
                    @ trade #{change.tradesAnalyzed}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function AlgorithmTab({ learningState }: { learningState: LearningState | null }) {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>

      {/* Section 1: Overview */}
      <div style={card}>
        <h2 style={cardTitle}>Algorithm Overview</h2>
        <p style={subtext}>
          The trading bot uses a <strong style={{ color: 'var(--ink)' }}>regime-adaptive</strong> strategy that
          classifies the current market environment and dynamically adjusts the weight given to
          trend-following vs mean-reversion strategies. Signals from four strategies are combined
          using regime-dependent weights, then fed into ATR-based position sizing and risk management.
        </p>
        <FlowDiagram />
      </div>

      {/* Section 2: Regime Detection */}
      <div style={card}>
        <h2 style={cardTitle}>Market Regime Detection</h2>
        <p style={subtext}>
          The bot classifies each asset's market regime using two daily indicators: the <strong style={{ color: 'var(--bone)' }}>Average Directional Index (ADX-14)</strong> for
          trend strength and <strong style={{ color: 'var(--bone)' }}>SMA-20 vs SMA-50</strong> for trend direction. This requires at least 60 daily bars.
        </p>
        <div style={{ ...mono, marginTop: '0.75rem' }}>
          <div><span style={{ color: 'var(--dim)' }}>{'// '}</span>Regime Classification</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span style={{ color: 'var(--dim)' }}>if</span> (ADX {'>'} 25 <span style={{ color: 'var(--dim)' }}>&amp;&amp;</span> SMA20 {'>'} SMA50)
            <span style={{ color: 'var(--color-positive)' }}> → TRENDING_UP</span>
          </div>
          <div>
            <span style={{ color: 'var(--dim)' }}>if</span> (ADX {'>'} 25 <span style={{ color: 'var(--dim)' }}>&amp;&amp;</span> SMA20 {'<'} SMA50)
            <span style={{ color: 'var(--color-negative)' }}> → TRENDING_DOWN</span>
          </div>
          <div>
            <span style={{ color: 'var(--dim)' }}>if</span> (ADX {'≤'} 25)
            <span style={{ color: 'var(--ink)' }}> → RANGE_BOUND</span>
          </div>
          <div>
            <span style={{ color: 'var(--dim)' }}>else</span>
            <span style={{ color: 'var(--dim)' }}> → UNKNOWN</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={badge('var(--color-positive)', 'transparent')}>TRENDING_UP</span>
          <span style={badge('var(--color-negative)', 'transparent')}>TRENDING_DOWN</span>
          <span style={badge('var(--ink)', 'transparent')}>RANGE_BOUND</span>
          <span style={badge('var(--dim)', 'transparent')}>UNKNOWN</span>
        </div>
      </div>

      {/* Section 3: Strategy Groups + Regime Weights */}
      <div style={card}>
        <h2 style={cardTitle}>Strategy Groups &amp; Regime Weights</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--ghost)', borderLeft: '2px solid var(--bone)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--bone)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group A — Trend-Following</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>Trend Momentum <span style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>(conf: 0.70)</span></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>MACD Trend <span style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>(conf: 0.60)</span></div>
          </div>
          <div style={{ padding: '1rem', border: '1px solid var(--ghost)', borderLeft: '2px solid var(--dim)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--dim)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group B — Mean-Reversion</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>BB + RSI Reversion <span style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>(conf: 0.70)</span></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--ink)' }}>VWAP Reversion <span style={{ color: 'var(--dim)', fontSize: '0.75rem' }}>(conf: 0.30–0.80)</span></div>
          </div>
        </div>

        <p style={subtext}>
          Each strategy produces a <strong style={{ color: 'var(--bone)' }}>score</strong> (-1 to +1) and a <strong style={{ color: 'var(--bone)' }}>confidence</strong> (0 to 1).
          Within each group, signals are combined using a confidence-weighted average. The two group scores
          are then blended using regime-dependent weights.
        </p>

        <div style={{ ...mono, marginBottom: '1.25rem' }}>
          <div><span style={{ color: 'var(--dim)' }}>{'// '}</span><span style={{ color: 'var(--bone)' }}>Step 1:</span> Within-group confidence-weighted average</div>
          <div>groupScore = <span style={{ color: 'var(--dim)' }}>Σ</span>(score<sub>i</sub> × confidence<sub>i</sub>) / <span style={{ color: 'var(--dim)' }}>Σ</span>(confidence<sub>i</sub>)</div>
          <div style={{ marginTop: '0.75rem' }}><span style={{ color: 'var(--dim)' }}>{'// '}</span><span style={{ color: 'var(--bone)' }}>Step 2:</span> Regime-weighted blend</div>
          <div>combined = trendGroupScore × <span style={{ color: 'var(--bone)' }}>w<sub>trend</sub></span> + reversionGroupScore × <span style={{ color: 'var(--dim)' }}>w<sub>reversion</sub></span></div>
        </div>

        <div style={{ border: '1px solid var(--ghost)', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--ink)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worked Example — TRENDING_UP Regime</div>
          <div style={{ ...mono, background: 'transparent', padding: 0 }}>
            <div style={{ color: 'var(--dim)', marginBottom: '0.35rem' }}>{'// '}Given strategy outputs:</div>
            <div>Trend Momentum:  score = <span style={{ color: 'var(--color-positive)' }}>+0.60</span>, confidence = 0.70</div>
            <div>MACD Trend:      score = <span style={{ color: 'var(--color-positive)' }}>+0.30</span>, confidence = 0.60</div>
            <div>BB+RSI Reversion: score = <span style={{ color: 'var(--color-negative)' }}>-0.20</span>, confidence = 0.70</div>
            <div>VWAP Reversion:  score = <span style={{ color: 'var(--color-negative)' }}>-0.10</span>, confidence = 0.50</div>

            <div style={{ marginTop: '0.75rem', color: 'var(--dim)' }}>{'// '}Step 1: Within-group averages</div>
            <div><span style={{ color: 'var(--bone)' }}>Group A</span> = (0.60×0.70 + 0.30×0.60) / (0.70+0.60) = 0.60/1.30 = <span style={{ color: 'var(--color-positive)', fontWeight: 700 }}>+0.462</span></div>
            <div><span style={{ color: 'var(--dim)' }}>Group B</span> = (-0.20×0.70 + -0.10×0.50) / (0.70+0.50) = -0.19/1.20 = <span style={{ color: 'var(--color-negative)', fontWeight: 700 }}>-0.158</span></div>

            <div style={{ marginTop: '0.75rem', color: 'var(--dim)' }}>{'// '}Step 2: Regime blend (TRENDING_UP: 80% trend, 20% reversion)</div>
            <div>combined = 0.462 × <span style={{ color: 'var(--bone)' }}>0.80</span> + (-0.158) × <span style={{ color: 'var(--dim)' }}>0.20</span> = 0.370 - 0.032 = <span style={{ color: 'var(--color-positive)', fontWeight: 700 }}>+0.338</span></div>
            <div style={{ marginTop: '0.35rem', color: 'var(--dim)' }}>→ Score 0.338 {'<'} 0.35 threshold → <span style={{ color: 'var(--dim)', fontWeight: 600 }}>HOLD</span> (just below BUY)</div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--dim)', marginBottom: '0.75rem' }}>
          Strategy group weights shift based on the detected market regime:
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--faint)' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Regime</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--bone)', fontWeight: 500 }}>Trend Weight</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--dim)', fontWeight: 500 }}>Reversion Weight</th>
            </tr>
          </thead>
          <tbody>
            {[
              { regime: 'TRENDING_UP', trend: '80%', rev: '20%', color: 'var(--color-positive)' },
              { regime: 'TRENDING_DOWN', trend: '80%', rev: '20%', color: 'var(--color-negative)' },
              { regime: 'RANGE_BOUND', trend: '20%', rev: '80%', color: 'var(--ink)' },
              { regime: 'UNKNOWN', trend: '50%', rev: '50%', color: 'var(--dim)' },
            ].map(row => (
              <tr key={row.regime} style={{ borderBottom: '1px dashed var(--ghost)' }}>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span style={{ color: row.color, fontWeight: 600 }}>{row.regime}</span>
                </td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--ink)' }}>{row.trend}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--ink)' }}>{row.rev}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Section 4: Individual Strategies */}
      <div style={card}>
        <h2 style={cardTitle}>Strategy Details</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          <StrategyCard
            name="Trend Momentum"
            group="Group A"
            groupColor="var(--bone)"
            indicators={['SMA-10', 'SMA-20', 'SMA-50', 'ROC-20']}
            scores={[
              { component: 'SMA alignment (10>20>50)', range: '±0.40' },
              { component: 'Rate of Change (20d)', range: '±0.30' },
              { component: '50-day breakout', range: '±0.20' },
              { component: 'SMA-20 slope', range: '±0.10' },
            ]}
            confidence="0.70 (fixed)"
          />
          <StrategyCard
            name="MACD Trend"
            group="Group A"
            groupColor="var(--bone)"
            indicators={['MACD (12/26/9)', 'Histogram', 'Signal Line']}
            scores={[
              { component: 'Histogram direction', range: '±0.30' },
              { component: 'Histogram slope', range: '±0.25 / ±0.15' },
              { component: 'MACD vs signal crossover', range: '±0.20' },
            ]}
            confidence="0.60 (fixed)"
          />
          <StrategyCard
            name="BB + RSI Reversion"
            group="Group B"
            groupColor="var(--dim)"
            indicators={['Bollinger Bands (20, 2σ)', 'RSI-14', 'Bandwidth']}
            scores={[
              { component: 'Price vs BB bands', range: '±0.50' },
              { component: 'RSI oversold/overbought', range: '±0.30 / ±0.15' },
              { component: 'Bandwidth filter (<1% skip)', range: '—' },
            ]}
            confidence="0.70 (fixed)"
          />
          <StrategyCard
            name="VWAP Reversion"
            group="Group B"
            groupColor="var(--dim)"
            indicators={['VWAP', 'Z-Score', 'Std Deviation']}
            scores={[
              { component: 'Z-score < -2 (deeply below)', range: '+0.80' },
              { component: 'Z-score -1.5 to -2', range: '+0.60' },
              { component: 'Z-score -1 to -1.5', range: '+0.40' },
              { component: 'Z-score > +2 (deeply above)', range: '-0.80' },
            ]}
            confidence="0.30 – 0.80 (dynamic)"
          />
        </div>
      </div>

      {/* Section 5: Signal Combination */}
      <div style={card}>
        <h2 style={cardTitle}>Final Recommendation Thresholds</h2>
        <p style={subtext}>
          After combining strategy group scores using the regime-weighted formula above, the final combined
          score is mapped to a recommendation using these thresholds:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
          {[
            { label: 'STRONG_BUY', threshold: '> 0.55', color: 'var(--color-positive)', bg: 'transparent' },
            { label: 'BUY', threshold: '> 0.35', color: 'var(--color-positive)', bg: 'transparent' },
            { label: 'HOLD', threshold: '-0.35 to 0.35', color: 'var(--dim)', bg: 'transparent' },
            { label: 'SELL', threshold: '< -0.35', color: 'var(--color-negative)', bg: 'transparent' },
            { label: 'STRONG_SELL', threshold: '< -0.55', color: 'var(--color-negative)', bg: 'transparent' },
          ].map(t => (
            <div key={t.label} style={{ padding: '0.6rem 0.75rem', background: t.bg, border: '1px solid var(--ghost)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: t.color }}>{t.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginTop: '0.15rem' }}>{t.threshold}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6: Position Sizing & Risk */}
      <div style={card}>
        <h2 style={cardTitle}>Position Sizing &amp; Risk Management</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-positive)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATR Position Sizing</div>
            <div style={mono}>
              <div>riskAmount = portfolio × {(BOT_CONFIG.riskPerTrade * 100)}%</div>
              <div>stopDistance = {BOT_CONFIG.atrStopMultiplier} × ATR</div>
              <div>shares = riskAmount / stopDistance</div>
              <div style={{ color: 'var(--dim)', marginTop: '0.25rem' }}>{'// '}Capped at {(DEFAULT_CONFIG.maxPositionSize * 100)}% of portfolio</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-negative)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trailing Stop</div>
            <div style={mono}>
              <div>highWaterMark = max(entry, peak)</div>
              <div>stopPrice = HWM − {BOT_CONFIG.atrStopMultiplier} × ATR</div>
              <div style={{ color: 'var(--color-negative)', marginTop: '0.25rem' }}>SELL 100% if price ≤ stopPrice</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiered Profit-Taking</div>
            <div style={mono}>
              <div>Tier 1: gain ≥ {BOT_CONFIG.atrProfit1Multiplier}×ATR → sell 25%</div>
              <div>Tier 2: gain ≥ {BOT_CONFIG.atrProfit2Multiplier}×ATR → sell 50%</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--dim)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trade Guards</div>
            <div style={mono}>
              <div>Min hold: {BOT_CONFIG.minHoldBars} bars (~2 hours)</div>
              <div>Cooldown: {BOT_CONFIG.tradeCooldownHours}h per symbol</div>
              <div>Max new buys/cycle: {BOT_CONFIG.maxNewPositionsPerCycle}</div>
              <div>Tx cost: {BOT_CONFIG.transactionCostBps} bps/side</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: Entry Filters */}
      <div style={card}>
        <h2 style={cardTitle}>Entry Filters</h2>
        <p style={subtext}>
          Before entering any position, the bot applies multiple filters to ensure quality setups
          and avoid problematic securities:
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--bone)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minimum Price Filter</div>
            <div style={mono}>
              <div>if (assetType === 'stock') {'{'}</div>
              <div>  if (price {'<'} ${BOT_CONFIG.minStockPrice}) skip</div>
              <div>{'}'}</div>
              <div style={{ color: 'var(--dim)', marginTop: '0.25rem' }}>{'// '}Avoids penny stock volatility</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--dim)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signal Quality Filter</div>
            <div style={mono}>
              <div>momentum.conf ≥ {BOT_CONFIG.minSignalConfidence}</div>
              <div>meanReversion.conf ≥ {BOT_CONFIG.minSignalConfidence}</div>
              <div>technical.conf ≥ {BOT_CONFIG.minSignalConfidence}</div>
              <div style={{ color: 'var(--dim)', marginTop: '0.25rem' }}>{'// '}No "Insufficient data" entries</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-positive)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multi-Timeframe Confirmation</div>
            <div style={mono}>
              <div>dailySignal = analyze(daily data)</div>
              <div>weeklyMomentum = analyze(weekly data)</div>
              <div style={{ color: 'var(--dim)', marginTop: '0.25rem' }}>{'// '}Require weekly momentum ≥ -0.2</div>
              <div style={{ color: 'var(--dim)' }}>{'// '}Skip if weekly trend is bearish</div>
            </div>
          </div>

          <div style={{ border: '1px solid var(--ghost)', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cooldown Period</div>
            <div style={mono}>
              <div>if (soldWithin{BOT_CONFIG.tradeCooldownHours}h) skip</div>
              <div style={{ color: 'var(--dim)', marginTop: '0.25rem' }}>{'// '}Prevents same-day round trips</div>
              <div style={{ color: 'var(--dim)' }}>{'// '}Auto-cleans after 7 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 8: Self-Learning System */}
      <LearningSection learningState={learningState} />

      {/* Section 9: Current Configuration */}
      <div style={card}>
        <h2 style={cardTitle}>Current Configuration</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Initial Capital', value: `$${DEFAULT_CONFIG.initialCapital.toLocaleString()}` },
            { label: 'Max Position Size', value: `${(DEFAULT_CONFIG.maxPositionSize * 100).toFixed(0)}%` },
            { label: 'Max Positions', value: `${DEFAULT_CONFIG.maxPositions}` },
            { label: 'Min Trade Value', value: `$${DEFAULT_CONFIG.minTradeValue}` },
            { label: 'Target Cash Ratio', value: `${(DEFAULT_CONFIG.targetCashRatio * 100).toFixed(0)}%` },
            { label: 'Buy Threshold', value: `> ${BOT_CONFIG.buyThreshold}` },
            { label: 'Min Stock Price', value: `$${BOT_CONFIG.minStockPrice}` },
            { label: 'Min Signal Confidence', value: `${BOT_CONFIG.minSignalConfidence}` },
            { label: 'Cooldown Period', value: `${BOT_CONFIG.tradeCooldownHours}h` },
            { label: 'ATR Stop Multiplier', value: `${BOT_CONFIG.atrStopMultiplier}×` },
            { label: 'Multi-Timeframe', value: 'Daily + Weekly' },
            { label: 'Schedule', value: DEFAULT_CONFIG.scheduleInterval },
            { label: 'Momentum Weight', value: `${(DEFAULT_CONFIG.strategyWeights.momentum * 100).toFixed(0)}%` },
            { label: 'Mean Reversion Weight', value: `${(DEFAULT_CONFIG.strategyWeights.meanReversion * 100).toFixed(0)}%` },
            { label: 'VWAP Reversion Weight', value: `${(DEFAULT_CONFIG.strategyWeights.vwapReversion * 100).toFixed(0)}%` },
            { label: 'Technical Weight', value: `${(DEFAULT_CONFIG.strategyWeights.technical * 100).toFixed(0)}%` },
          ].map(item => (
            <div key={item.label} style={{ padding: '0.75rem', border: '1px solid var(--ghost)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--dim)', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--bone)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
