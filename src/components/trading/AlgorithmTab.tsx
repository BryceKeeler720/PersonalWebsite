import { DEFAULT_CONFIG } from './types';

const BOT_CONFIG = {
  buyThreshold: 0.35,
  riskPerTrade: 0.01,
  atrStopMultiplier: 2,
  atrProfit1Multiplier: 3,
  atrProfit2Multiplier: 5,
  maxNewPositionsPerCycle: 3,
  minHoldBars: 24,
  transactionCostBps: 5,
  tradeCooldownHours: 4,
};

const card: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '16px',
  padding: '1.5rem',
  backdropFilter: 'blur(10px)',
};

const cardTitle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 600,
  color: 'rgba(255, 255, 255, 0.9)',
  margin: '0 0 1rem',
  paddingBottom: '0.75rem',
  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
};

const mono: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.8rem',
  background: 'rgba(255, 255, 255, 0.05)',
  padding: '0.75rem 1rem',
  borderRadius: '8px',
  color: 'rgba(255, 255, 255, 0.8)',
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
  color: 'rgba(255, 255, 255, 0.55)',
  lineHeight: 1.6,
  margin: '0.5rem 0',
};

function FlowDiagram() {
  const boxW = 120, boxH = 36, gap = 24;
  const steps = ['Market Data', 'Regime\nDetection', 'Strategy\nGroups', 'Signal\nCombination', 'Trade\nDecision'];
  const totalW = steps.length * boxW + (steps.length - 1) * gap;
  const colors = ['#6366f1', '#f59e0b', '#8b5cf6', '#22c55e', '#22c55e'];

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <svg viewBox={`0 0 ${totalW} ${boxH + 10}`} width={totalW} height={boxH + 10} style={{ display: 'block', maxWidth: '100%' }}>
        {steps.map((label, i) => {
          const x = i * (boxW + gap);
          return (
            <g key={i}>
              <rect x={x} y={5} width={boxW} height={boxH} rx={8} fill="rgba(255,255,255,0.05)" stroke={colors[i]} strokeWidth={1.5} />
              {label.split('\n').map((line, li) => (
                <text key={li} x={x + boxW / 2} y={5 + boxH / 2 + (li - (label.split('\n').length - 1) / 2) * 12} fill="white" fontSize={10} fontFamily="JetBrains Mono, monospace" textAnchor="middle" dominantBaseline="middle">
                  {line}
                </text>
              ))}
              {i < steps.length - 1 && (
                <polygon points={`${x + boxW + 4},${5 + boxH / 2} ${x + boxW + gap - 4},${5 + boxH / 2 - 4} ${x + boxW + gap - 4},${5 + boxH / 2 + 4}`} fill="rgba(255,255,255,0.3)" />
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', flex: 1 }}>{label}</span>
      <code style={{ fontSize: '0.8rem', color: '#8b5cf6', fontFamily: 'JetBrains Mono, monospace' }}>{value}</code>
      {maxLabel && <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginLeft: '0.5rem' }}>{maxLabel}</span>}
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
    <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1.25rem', border: `1px solid ${groupColor}22` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#fff' }}>{name}</h3>
        <span style={badge(groupColor, `${groupColor}20`)}>{group}</span>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Indicators</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
          {indicators.map((ind, i) => (
            <span key={i} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: 'rgba(255,255,255,0.7)' }}>
              {ind}
            </span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score Components</div>
        {scores.map((s, i) => (
          <ScoreBar key={i} label={s.component} value={s.range} />
        ))}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.5rem' }}>
        Confidence: <span style={{ color: groupColor, fontWeight: 600 }}>{confidence}</span>
      </div>
    </div>
  );
}

export default function AlgorithmTab() {
  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>

      {/* Section 1: Overview */}
      <div style={card}>
        <h2 style={cardTitle}>Algorithm Overview</h2>
        <p style={subtext}>
          The trading bot uses a <strong style={{ color: '#f59e0b' }}>regime-adaptive</strong> strategy that
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
          The bot classifies each asset's market regime using two daily indicators: the <strong style={{ color: '#fff' }}>Average Directional Index (ADX-14)</strong> for
          trend strength and <strong style={{ color: '#fff' }}>SMA-20 vs SMA-50</strong> for trend direction. This requires at least 60 daily bars.
        </p>
        <div style={{ ...mono, marginTop: '0.75rem' }}>
          <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>{'// '}</span>Regime Classification</div>
          <div style={{ marginTop: '0.25rem' }}>
            <span style={{ color: '#c084fc' }}>if</span> (ADX {'>'} 25 <span style={{ color: '#c084fc' }}>&amp;&amp;</span> SMA20 {'>'} SMA50)
            <span style={{ color: '#22c55e' }}> → TRENDING_UP</span>
          </div>
          <div>
            <span style={{ color: '#c084fc' }}>if</span> (ADX {'>'} 25 <span style={{ color: '#c084fc' }}>&amp;&amp;</span> SMA20 {'<'} SMA50)
            <span style={{ color: '#ef4444' }}> → TRENDING_DOWN</span>
          </div>
          <div>
            <span style={{ color: '#c084fc' }}>if</span> (ADX {'≤'} 25)
            <span style={{ color: '#f59e0b' }}> → RANGE_BOUND</span>
          </div>
          <div>
            <span style={{ color: '#c084fc' }}>else</span>
            <span style={{ color: 'rgba(255,255,255,0.5)' }}> → UNKNOWN</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          <span style={badge('#22c55e', 'rgba(34,197,94,0.15)')}>TRENDING_UP</span>
          <span style={badge('#ef4444', 'rgba(239,68,68,0.15)')}>TRENDING_DOWN</span>
          <span style={badge('#f59e0b', 'rgba(245,158,11,0.15)')}>RANGE_BOUND</span>
          <span style={badge('rgba(255,255,255,0.5)', 'rgba(255,255,255,0.08)')}>UNKNOWN</span>
        </div>
      </div>

      {/* Section 3: Strategy Groups + Regime Weights */}
      <div style={card}>
        <h2 style={cardTitle}>Strategy Groups &amp; Regime Weights</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#818cf8', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group A — Trend-Following</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Trend Momentum <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>(conf: 0.70)</span></div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>MACD Trend <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>(conf: 0.60)</span></div>
          </div>
          <div style={{ padding: '1rem', background: 'rgba(168,85,247,0.08)', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.2)' }}>
            <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Group B — Mean-Reversion</div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>BB + RSI Reversion <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>(conf: 0.70)</span></div>
            <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>VWAP Reversion <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>(conf: 0.30–0.80)</span></div>
          </div>
        </div>

        <p style={subtext}>
          Each strategy produces a <strong style={{ color: '#fff' }}>score</strong> (-1 to +1) and a <strong style={{ color: '#fff' }}>confidence</strong> (0 to 1).
          Within each group, signals are combined using a confidence-weighted average. The two group scores
          are then blended using regime-dependent weights.
        </p>

        <div style={{ ...mono, marginBottom: '1.25rem' }}>
          <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>{'// '}</span><span style={{ color: '#818cf8' }}>Step 1:</span> Within-group confidence-weighted average</div>
          <div>groupScore = <span style={{ color: '#c084fc' }}>Σ</span>(score<sub>i</sub> × confidence<sub>i</sub>) / <span style={{ color: '#c084fc' }}>Σ</span>(confidence<sub>i</sub>)</div>
          <div style={{ marginTop: '0.75rem' }}><span style={{ color: 'rgba(255,255,255,0.4)' }}>{'// '}</span><span style={{ color: '#818cf8' }}>Step 2:</span> Regime-weighted blend</div>
          <div>combined = trendGroupScore × <span style={{ color: '#818cf8' }}>w<sub>trend</sub></span> + reversionGroupScore × <span style={{ color: '#a78bfa' }}>w<sub>reversion</sub></span></div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Worked Example — TRENDING_UP Regime</div>
          <div style={{ ...mono, background: 'transparent', padding: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '0.35rem' }}>{'// '}Given strategy outputs:</div>
            <div>Trend Momentum:  score = <span style={{ color: '#22c55e' }}>+0.60</span>, confidence = 0.70</div>
            <div>MACD Trend:      score = <span style={{ color: '#22c55e' }}>+0.30</span>, confidence = 0.60</div>
            <div>BB+RSI Reversion: score = <span style={{ color: '#ef4444' }}>-0.20</span>, confidence = 0.70</div>
            <div>VWAP Reversion:  score = <span style={{ color: '#ef4444' }}>-0.10</span>, confidence = 0.50</div>

            <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{'// '}Step 1: Within-group averages</div>
            <div><span style={{ color: '#818cf8' }}>Group A</span> = (0.60×0.70 + 0.30×0.60) / (0.70+0.60) = 0.60/1.30 = <span style={{ color: '#22c55e', fontWeight: 700 }}>+0.462</span></div>
            <div><span style={{ color: '#a78bfa' }}>Group B</span> = (-0.20×0.70 + -0.10×0.50) / (0.70+0.50) = -0.19/1.20 = <span style={{ color: '#ef4444', fontWeight: 700 }}>-0.158</span></div>

            <div style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>{'// '}Step 2: Regime blend (TRENDING_UP: 80% trend, 20% reversion)</div>
            <div>combined = 0.462 × <span style={{ color: '#818cf8' }}>0.80</span> + (-0.158) × <span style={{ color: '#a78bfa' }}>0.20</span> = 0.370 - 0.032 = <span style={{ color: '#22c55e', fontWeight: 700 }}>+0.338</span></div>
            <div style={{ marginTop: '0.35rem', color: 'rgba(255,255,255,0.5)' }}>→ Score 0.338 {'<'} 0.35 threshold → <span style={{ color: '#94a3b8', fontWeight: 600 }}>HOLD</span> (just below BUY)</div>
          </div>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>
          Strategy group weights shift based on the detected market regime:
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.6rem 0.75rem', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Regime</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#818cf8', fontWeight: 500 }}>Trend Weight</th>
              <th style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: '#a78bfa', fontWeight: 500 }}>Reversion Weight</th>
            </tr>
          </thead>
          <tbody>
            {[
              { regime: 'TRENDING_UP', trend: '80%', rev: '20%', color: '#22c55e' },
              { regime: 'TRENDING_DOWN', trend: '80%', rev: '20%', color: '#ef4444' },
              { regime: 'RANGE_BOUND', trend: '20%', rev: '80%', color: '#f59e0b' },
              { regime: 'UNKNOWN', trend: '50%', rev: '50%', color: 'rgba(255,255,255,0.5)' },
            ].map(row => (
              <tr key={row.regime} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  <span style={{ color: row.color, fontWeight: 600 }}>{row.regime}</span>
                </td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'rgba(255,255,255,0.8)' }}>{row.trend}</td>
                <td style={{ textAlign: 'center', padding: '0.6rem 0.75rem', color: 'rgba(255,255,255,0.8)' }}>{row.rev}</td>
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
            groupColor="#818cf8"
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
            groupColor="#818cf8"
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
            groupColor="#a78bfa"
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
            groupColor="#a78bfa"
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
            { label: 'STRONG_BUY', threshold: '> 0.55', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
            { label: 'BUY', threshold: '> 0.35', color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
            { label: 'HOLD', threshold: '-0.35 to 0.35', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
            { label: 'SELL', threshold: '< -0.35', color: '#f87171', bg: 'rgba(248,113,113,0.15)' },
            { label: 'STRONG_SELL', threshold: '< -0.55', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
          ].map(t => (
            <div key={t.label} style={{ padding: '0.6rem 0.75rem', background: t.bg, borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: t.color }}>{t.label}</div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.15rem' }}>{t.threshold}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6: Position Sizing & Risk */}
      <div style={card}>
        <h2 style={cardTitle}>Position Sizing &amp; Risk Management</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ATR Position Sizing</div>
            <div style={mono}>
              <div>riskAmount = portfolio × {(BOT_CONFIG.riskPerTrade * 100)}%</div>
              <div>stopDistance = {BOT_CONFIG.atrStopMultiplier} × ATR</div>
              <div>shares = riskAmount / stopDistance</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>{'// '}Capped at {(DEFAULT_CONFIG.maxPositionSize * 100)}% of portfolio</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trailing Stop</div>
            <div style={mono}>
              <div>highWaterMark = max(entry, peak)</div>
              <div>stopPrice = HWM − {BOT_CONFIG.atrStopMultiplier} × ATR</div>
              <div style={{ color: '#ef4444', marginTop: '0.25rem' }}>SELL 100% if price ≤ stopPrice</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tiered Profit-Taking</div>
            <div style={mono}>
              <div>Tier 1: gain ≥ {BOT_CONFIG.atrProfit1Multiplier}×ATR → sell 25%</div>
              <div>Tier 2: gain ≥ {BOT_CONFIG.atrProfit2Multiplier}×ATR → sell 50%</div>
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 600, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trade Guards</div>
            <div style={mono}>
              <div>Min hold: {BOT_CONFIG.minHoldBars} bars (~2 hours)</div>
              <div>Cooldown: {BOT_CONFIG.tradeCooldownHours}h per symbol</div>
              <div>Max new buys/cycle: {BOT_CONFIG.maxNewPositionsPerCycle}</div>
              <div>Tx cost: {BOT_CONFIG.transactionCostBps} bps/side</div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 7: Current Configuration */}
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
            { label: 'Risk Per Trade', value: `${(BOT_CONFIG.riskPerTrade * 100).toFixed(0)}%` },
            { label: 'ATR Stop Multiplier', value: `${BOT_CONFIG.atrStopMultiplier}×` },
            { label: 'Schedule', value: DEFAULT_CONFIG.scheduleInterval },
            { label: 'Momentum Weight', value: `${(DEFAULT_CONFIG.strategyWeights.momentum * 100).toFixed(0)}%` },
            { label: 'Mean Reversion Weight', value: `${(DEFAULT_CONFIG.strategyWeights.meanReversion * 100).toFixed(0)}%` },
            { label: 'Sentiment Weight', value: `${(DEFAULT_CONFIG.strategyWeights.sentiment * 100).toFixed(0)}%` },
            { label: 'Technical Weight', value: `${(DEFAULT_CONFIG.strategyWeights.technical * 100).toFixed(0)}%` },
            { label: 'Transaction Cost', value: `${BOT_CONFIG.transactionCostBps} bps/side` },
          ].map(item => (
            <div key={item.label} style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#fff' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
