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
  background: 'rgba(220, 215, 186, 0.03)',
  border: '1px solid rgba(220, 215, 186, 0.1)',
  borderRadius: '16px',
  padding: '1.5rem',
  backdropFilter: 'blur(10px)',
};

const cardTitle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: 'var(--kana-fg)',
  margin: '0 0 1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(220, 215, 186, 0.1)',
};

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.8rem',
  background: 'rgba(220, 215, 186, 0.05)',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  color: 'var(--kana-fg-dim)',
  lineHeight: 1.6,
  overflowX: 'auto',
};

const badge = (color: string, bg: string): React.CSSProperties => ({
  display: 'inline-block',
  padding: '0.2rem 0.6rem',
  borderRadius: '4px',
  fontSize: '0.75rem',
  fontWeight: 600,
  color,
  background: bg,
});

const subtext: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--kana-fg-dim)',
  lineHeight: 1.6,
  margin: '0.5rem 0',
};

function FlowDiagram() {
  const boxW = 120, boxH = 36, gap = 24;
  const steps = ['Market Data', 'Regime\nDetection', 'Strategy\nGroups', 'Signal\nCombination', 'Trade\nDecision'];
  const totalW = steps.length * boxW + (steps.length - 1) * gap;
  const colors = ['#7E9CD8', '#C0A36E', '#957FB8', '#76946A', '#76946A'];

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <svg viewBox={`0 0 ${totalW} ${boxH + 10}`} width={totalW} height={boxH + 10} style={{ display: 'block', maxWidth: '100%' }}>
        {steps.map((label, i) => {
          const x = i * (boxW + gap);
          return (
            <g key={i}>
              <rect x={x} y={5} width={boxW} height={boxH} rx={8} fill="rgba(220,215,186,0.05)" stroke={colors[i]} strokeWidth={1.5} />
              {label.split('\n').map((line, li) => (
                <text key={li} x={x + boxW / 2} y={5 + boxH / 2 + (li - (label.split('\n').length - 1) / 2) * 12} fill="#DCD7BA" fontSize={10} fontFamily="JetBrains Mono, monospace" textAnchor="middle" dominantBaseline="middle">
                  {line}
                </text>
              ))}
              {i < steps.length - 1 && (
                <polygon points={`${x + boxW + 4},${5 + boxH / 2} ${x + boxW + gap - 4},${5 + boxH / 2 - 4} ${x + boxW + gap - 4},${5 + boxH / 2 + 4}`} fill="rgba(220,215,186,0.3)" />
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(220,215,186,0.04)' }}>
      <span style={{ fontSize: '0.8rem', color: 'var(--kana-fg-dim)', flex: 1 }}>{label}</span>
      <code style={{ fontSize: '0.8rem', color: '#957FB8', fontFamily: 'JetBrains Mono, monospace' }}>{value}</code>
      {maxLabel && <span style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginLeft: '0.5rem' }}>{maxLabel}</span>}
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
    <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${groupColor}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--kana-fg)' }}>{name}</h3>
        <span style={badge(groupColor, `${groupColor}20`)}>{group}</span>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indicators</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {indicators.map((ind, i) => (
            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(220,215,186,0.05)', borderRadius: '4px', color: 'var(--kana-fg-dim)' }}>
              {ind}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Components</div>
        {scores.map((s, i) => (
          <ScoreBar key={i} label={s.component} value={s.range} />
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--kana-fg-muted)', marginTop: '0.5rem' }}>
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
          <div style={{ padding: '0.75rem', background: 'rgba(220,215,186,0.02)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.25rem' }}>Status</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: warmupComplete ? '#76946A' : '#C0A36E' }}>
              {warmupComplete ? 'Active' : 'Warming Up'}
            </div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(220,215,186,0.02)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.25rem' }}>Trades Analyzed</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--kana-fg)' }}>{totalTradesAnalyzed}</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(220,215,186,0.02)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.25rem' }}>Rolling Win Rate</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--kana-fg)' }}>{winRate}%</div>
          </div>
          <div style={{ padding: '0.75rem', background: 'rgba(220,215,186,0.02)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.25rem' }}>Rolling Window</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--kana-fg)' }}>{closedTrades.length}/200</div>
          </div>
        </div>

        {!warmupComplete && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--kana-fg-muted)' }}>Warmup Progress</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--kana-fg-dim)' }}>{totalTradesAnalyzed}/50 trades</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(220,215,186,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${warmupProgress}%`, background: '#C0A36E', borderRadius: '3px', transition: 'width 0.3s ease' }} />
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--kana-fg-muted)', marginTop: '0.5rem' }}>
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
            <tr style={{ borderBottom: '1px solid rgba(220,215,186,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-muted)', fontWeight: 500 }}>Regime</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#7E9CD8', fontWeight: 500 }}>Trend (Default)</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#7E9CD8', fontWeight: 500 }}>Trend (Learned)</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#957FB8', fontWeight: 500 }}>Reversion (Learned)</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-muted)', fontWeight: 500 }}>Delta</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(DEFAULT_REGIME_WEIGHTS).map(([regime, defaults]) => {
              const learned = regimeWeights[regime] || defaults;
              const delta = learned.trend - defaults.trend;
              const deltaColor = Math.abs(delta) < 0.005 ? 'var(--kana-fg-muted)' : delta > 0 ? '#76946A' : '#C34043';
              const regimeColors: Record<string, string> = {
                TRENDING_UP: '#76946A', TRENDING_DOWN: '#C34043',
                RANGE_BOUND: '#C0A36E', UNKNOWN: 'var(--kana-fg-muted)',
              };
              return (
                <tr key={regime} style={{ borderBottom: '1px solid rgba(220,215,186,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.75rem' }}>
                    <span style={{ color: regimeColors[regime] || 'var(--kana-fg)', fontWeight: 600 }}>{regime}</span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-muted)' }}>{(defaults.trend * 100).toFixed(0)}%</td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-dim)', fontWeight: 600 }}>{(learned.trend * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-dim)', fontWeight: 600 }}>{(learned.reversion * 100).toFixed(1)}%</td>
                  <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: deltaColor, fontWeight: 600 }}>
                    {delta > 0 ? '+' : ''}{(delta * 100).toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {weightHistory.length > 0 && (
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--kana-fg-muted)' }}>
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
            <tr style={{ borderBottom: '1px solid rgba(220,215,186,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--kana-fg-muted)', fontWeight: 500 }}>Parameter</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--kana-fg-muted)', fontWeight: 500 }}>Default</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--kana-fg-dim)', fontWeight: 500 }}>Current</th>
              <th style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--kana-fg-muted)', fontWeight: 500 }}>Change</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(PARAM_DEFAULTS).map(([key, defaultVal]) => {
              const current = params[key] ?? defaultVal;
              const delta = current - defaultVal;
              const deltaColor = Math.abs(delta) < 0.001 ? 'var(--kana-fg-muted)' : delta > 0 ? '#76946A' : '#C34043';
              return (
                <tr key={key} style={{ borderBottom: '1px solid rgba(220,215,186,0.04)' }}>
                  <td style={{ padding: '0.5rem 0.75rem', color: 'var(--kana-fg-dim)' }}>{PARAM_LABELS[key] || key}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--kana-fg-muted)' }}>{defaultVal}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem 0.75rem', color: 'var(--kana-fg)', fontWeight: 600 }}>{current}</td>
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
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', borderBottom: '1px solid rgba(220,215,186,0.04)', fontSize: '0.8rem' }}>
                <div>
                  <span style={{ color: 'var(--kana-fg-dim)', fontWeight: 600 }}>{PARAM_LABELS[change.paramName] || change.paramName}</span>
                  <span style={{ color: 'var(--kana-fg-muted)', marginLeft: '0.5rem' }}>
                    {change.oldValue} → {change.newValue}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: 'var(--kana-fg-muted)', fontSize: '0.7rem' }}>
                    WR: {(change.olderWinRate * 100).toFixed(0)}% → {(change.newerWinRate * 100).toFixed(0)}%
                  </span>
                  <span style={{ color: 'var(--kana-fg-muted)', fontSize: '0.7rem', marginLeft: '0.75rem' }}>
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
          The trading bot uses a <strong style={{ color: 'var(--kana-yellow)' }}>regime-adaptive</strong> strategy that
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
          The bot classifies each asset's market regime using two daily indicators: the <strong style={{ color: 'var(--kana-fg)' }}>Average Directional Index (ADX-14)</strong> for
          trend strength and <strong style={{ color: 'var(--kana-fg)' }}>SMA-20 vs SMA-50</strong> for trend direction. This requires at least 60 daily bars.
        </p>
        <div style={{ ...mono, marginTop: '0.75rem' }}>
          <div><span style={{ color: 'var(--kana-fg-muted)' }}>{'// '}</span>Regime Classification</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span style={{ color: '#957FB8' }}>if</span> (ADX {'>'} 25 <span style={{ color: '#957FB8' }}>&amp;&amp;</span> SMA20 {'>'} SMA50)
            <span style={{ color: '#76946A' }}> → TRENDING_UP</span>
          </div>
          <div>
            <span style={{ color: '#957FB8' }}>if</span> (ADX {'>'} 25 <span style={{ color: '#957FB8' }}>&amp;&amp;</span> SMA20 {'<'} SMA50)
            <span style={{ color: '#C34043' }}> → TRENDING_DOWN</span>
          </div>
          <div>
            <span style={{ color: '#957FB8' }}>if</span> (ADX {'≤'} 25)
            <span style={{ color: 'var(--kana-yellow)' }}> → RANGE_BOUND</span>
          </div>
          <div>
            <span style={{ color: '#957FB8' }}>else</span>
            <span style={{ color: 'var(--kana-fg-muted)' }}> → UNKNOWN</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={badge('#76946A', 'rgba(118,148,106,0.15)')}>TRENDING_UP</span>
          <span style={badge('#C34043', 'rgba(195,64,67,0.15)')}>TRENDING_DOWN</span>
          <span style={badge('#C0A36E', 'rgba(192,163,110,0.15)')}>RANGE_BOUND</span>
          <span style={badge('var(--kana-fg-muted)', 'rgba(220,215,186,0.08)')}>UNKNOWN</span>
        </div>
      </div>

      {/* Section 3: Strategy Groups + Regime Weights */}
      <div style={card}>
        <h2 style={cardTitle}>Strategy Groups &amp; Regime Weights</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(126,156,216,0.08)', borderRadius: '12px', border: '1px solid rgba(126,156,216,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#7E9CD8', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group A — Trend-Following</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--kana-fg-dim)' }}>Trend Momentum <span style={{ color: 'var(--kana-fg-muted)', fontSize: '0.75rem' }}>(conf: 0.70)</span></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--kana-fg-dim)' }}>MACD Trend <span style={{ color: 'var(--kana-fg-muted)', fontSize: '0.75rem' }}>(conf: 0.60)</span></div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(149,127,184,0.08)', borderRadius: '12px', border: '1px solid rgba(149,127,184,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#957FB8', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group B — Mean-Reversion</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--kana-fg-dim)' }}>BB + RSI Reversion <span style={{ color: 'var(--kana-fg-muted)', fontSize: '0.75rem' }}>(conf: 0.70)</span></div>
            <div style={{ fontSize: '0.85rem', color: 'var(--kana-fg-dim)' }}>VWAP Reversion <span style={{ color: 'var(--kana-fg-muted)', fontSize: '0.75rem' }}>(conf: 0.30–0.80)</span></div>
          </div>
        </div>

        <p style={subtext}>
          Each strategy produces a <strong style={{ color: 'var(--kana-fg)' }}>score</strong> (-1 to +1) and a <strong style={{ color: 'var(--kana-fg)' }}>confidence</strong> (0 to 1).
          Within each group, signals are combined using a confidence-weighted average. The two group scores
          are then blended using regime-dependent weights.
        </p>

        <div style={{ ...mono, marginBottom: '1.25rem' }}>
          <div><span style={{ color: 'var(--kana-fg-muted)' }}>{'// '}</span><span style={{ color: '#7E9CD8' }}>Step 1:</span> Within-group confidence-weighted average</div>
          <div>groupScore = <span style={{ color: '#957FB8' }}>Σ</span>(score<sub>i</sub> × confidence<sub>i</sub>) / <span style={{ color: '#957FB8' }}>Σ</span>(confidence<sub>i</sub>)</div>
          <div style={{ marginTop: '0.75rem' }}><span style={{ color: 'var(--kana-fg-muted)' }}>{'// '}</span><span style={{ color: '#7E9CD8' }}>Step 2:</span> Regime-weighted blend</div>
          <div>combined = trendGroupScore × <span style={{ color: '#7E9CD8' }}>w<sub>trend</sub></span> + reversionGroupScore × <span style={{ color: '#957FB8' }}>w<sub>reversion</sub></span></div>
        </div>

        <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--kana-yellow)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worked Example — TRENDING_UP Regime</div>
          <div style={{ ...mono, background: 'transparent', padding: 0 }}>
            <div style={{ color: 'var(--kana-fg-muted)', marginBottom: '0.35rem' }}>{'// '}Given strategy outputs:</div>
            <div>Trend Momentum:  score = <span style={{ color: '#76946A' }}>+0.60</span>, confidence = 0.70</div>
            <div>MACD Trend:      score = <span style={{ color: '#76946A' }}>+0.30</span>, confidence = 0.60</div>
            <div>BB+RSI Reversion: score = <span style={{ color: '#C34043' }}>-0.20</span>, confidence = 0.70</div>
            <div>VWAP Reversion:  score = <span style={{ color: '#C34043' }}>-0.10</span>, confidence = 0.50</div>

            <div style={{ marginTop: '0.75rem', color: 'var(--kana-fg-muted)' }}>{'// '}Step 1: Within-group averages</div>
            <div><span style={{ color: '#7E9CD8' }}>Group A</span> = (0.60×0.70 + 0.30×0.60) / (0.70+0.60) = 0.60/1.30 = <span style={{ color: '#76946A', fontWeight: 700 }}>+0.462</span></div>
            <div><span style={{ color: '#957FB8' }}>Group B</span> = (-0.20×0.70 + -0.10×0.50) / (0.70+0.50) = -0.19/1.20 = <span style={{ color: '#C34043', fontWeight: 700 }}>-0.158</span></div>

            <div style={{ marginTop: '0.75rem', color: 'var(--kana-fg-muted)' }}>{'// '}Step 2: Regime blend (TRENDING_UP: 80% trend, 20% reversion)</div>
            <div>combined = 0.462 × <span style={{ color: '#7E9CD8' }}>0.80</span> + (-0.158) × <span style={{ color: '#957FB8' }}>0.20</span> = 0.370 - 0.032 = <span style={{ color: '#76946A', fontWeight: 700 }}>+0.338</span></div>
            <div style={{ marginTop: '0.35rem', color: 'var(--kana-fg-muted)' }}>→ Score 0.338 {'<'} 0.35 threshold → <span style={{ color: '#727169', fontWeight: 600 }}>HOLD</span> (just below BUY)</div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--kana-fg-muted)', marginBottom: '0.75rem' }}>
          Strategy group weights shift based on the detected market regime:
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(220,215,186,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-muted)', fontWeight: 500 }}>Regime</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#7E9CD8', fontWeight: 500 }}>Trend Weight</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#957FB8', fontWeight: 500 }}>Reversion Weight</th>
            </tr>
          </thead>
          <tbody>
            {[
              { regime: 'TRENDING_UP', trend: '80%', rev: '20%', color: '#76946A' },
              { regime: 'TRENDING_DOWN', trend: '80%', rev: '20%', color: '#C34043' },
              { regime: 'RANGE_BOUND', trend: '20%', rev: '80%', color: 'var(--kana-yellow)' },
              { regime: 'UNKNOWN', trend: '50%', rev: '50%', color: 'var(--kana-fg-muted)' },
            ].map(row => (
              <tr key={row.regime} style={{ borderBottom: '1px solid rgba(220,215,186,0.04)' }}>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span style={{ color: row.color, fontWeight: 600 }}>{row.regime}</span>
                </td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-dim)' }}>{row.trend}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'var(--kana-fg-dim)' }}>{row.rev}</td>
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
            groupColor="#7E9CD8"
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
            groupColor="#7E9CD8"
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
            groupColor="#957FB8"
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
            groupColor="#957FB8"
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
            { label: 'STRONG_BUY', threshold: '> 0.55', color: '#76946A', bg: 'rgba(118,148,106,0.15)' },
            { label: 'BUY', threshold: '> 0.35', color: '#98BB6C', bg: 'rgba(152,187,108,0.15)' },
            { label: 'HOLD', threshold: '-0.35 to 0.35', color: '#727169', bg: 'rgba(114,113,105,0.1)' },
            { label: 'SELL', threshold: '< -0.35', color: '#D27E99', bg: 'rgba(210,126,153,0.15)' },
            { label: 'STRONG_SELL', threshold: '< -0.55', color: '#C34043', bg: 'rgba(195,64,67,0.15)' },
          ].map(t => (
            <div key={t.label} style={{ padding: '0.6rem 0.75rem', background: t.bg, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: t.color }}>{t.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginTop: '0.15rem' }}>{t.threshold}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6: Position Sizing & Risk */}
      <div style={card}>
        <h2 style={cardTitle}>Position Sizing &amp; Risk Management</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--kana-green)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATR Position Sizing</div>
            <div style={mono}>
              <div>riskAmount = portfolio × {(BOT_CONFIG.riskPerTrade * 100)}%</div>
              <div>stopDistance = {BOT_CONFIG.atrStopMultiplier} × ATR</div>
              <div>shares = riskAmount / stopDistance</div>
              <div style={{ color: 'var(--kana-fg-muted)', marginTop: '0.25rem' }}>{'// '}Capped at {(DEFAULT_CONFIG.maxPositionSize * 100)}% of portfolio</div>
            </div>
          </div>

          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--kana-red)', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trailing Stop</div>
            <div style={mono}>
              <div>highWaterMark = max(entry, peak)</div>
              <div>stopPrice = HWM − {BOT_CONFIG.atrStopMultiplier} × ATR</div>
              <div style={{ color: 'var(--kana-red)', marginTop: '0.25rem' }}>SELL 100% if price ≤ stopPrice</div>
            </div>
          </div>

          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#C0A36E', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiered Profit-Taking</div>
            <div style={mono}>
              <div>Tier 1: gain ≥ {BOT_CONFIG.atrProfit1Multiplier}×ATR → sell 25%</div>
              <div>Tier 2: gain ≥ {BOT_CONFIG.atrProfit2Multiplier}×ATR → sell 50%</div>
            </div>
          </div>

          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#957FB8', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trade Guards</div>
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
          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#7E9CD8', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Minimum Price Filter</div>
            <div style={mono}>
              <div>if (assetType === 'stock') {'{'}</div>
              <div>  if (price {'<'} ${BOT_CONFIG.minStockPrice}) skip</div>
              <div>{'}'}</div>
              <div style={{ color: 'var(--kana-fg-muted)', marginTop: '0.25rem' }}>{'// '}Avoids penny stock volatility</div>
            </div>
          </div>

          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#957FB8', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signal Quality Filter</div>
            <div style={mono}>
              <div>momentum.conf ≥ {BOT_CONFIG.minSignalConfidence}</div>
              <div>meanReversion.conf ≥ {BOT_CONFIG.minSignalConfidence}</div>
              <div>technical.conf ≥ {BOT_CONFIG.minSignalConfidence}</div>
              <div style={{ color: 'var(--kana-fg-muted)', marginTop: '0.25rem' }}>{'// '}No "Insufficient data" entries</div>
            </div>
          </div>

          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#76946A', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multi-Timeframe Confirmation</div>
            <div style={mono}>
              <div>dailySignal = analyze(daily data)</div>
              <div>weeklyMomentum = analyze(weekly data)</div>
              <div style={{ color: 'var(--kana-fg-muted)', marginTop: '0.25rem' }}>{'// '}Require weekly momentum ≥ -0.2</div>
              <div style={{ color: 'var(--kana-fg-muted)' }}>{'// '}Skip if weekly trend is bearish</div>
            </div>
          </div>

          <div style={{ background: 'rgba(220,215,186,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#C0A36E', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cooldown Period</div>
            <div style={mono}>
              <div>if (soldWithin{BOT_CONFIG.tradeCooldownHours}h) skip</div>
              <div style={{ color: 'var(--kana-fg-muted)', marginTop: '0.25rem' }}>{'// '}Prevents same-day round trips</div>
              <div style={{ color: 'var(--kana-fg-muted)' }}>{'// '}Auto-cleans after 7 days</div>
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
            { label: 'Sentiment Weight', value: `${(DEFAULT_CONFIG.strategyWeights.sentiment * 100).toFixed(0)}%` },
            { label: 'Technical Weight', value: `${(DEFAULT_CONFIG.strategyWeights.technical * 100).toFixed(0)}%` },
          ].map(item => (
            <div key={item.label} style={{ padding: '0.75rem', background: 'rgba(220,215,186,0.02)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--kana-fg-muted)', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--kana-fg)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
