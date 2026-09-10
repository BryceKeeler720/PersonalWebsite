import { useState, useEffect, useMemo } from 'react';
import ContainerGrid from './ContainerGrid';
import UptimeMonitor from './UptimeMonitor';
import NetworkTopology from './NetworkTopology';
import type { HomelabSnapshot, HomelabHistory } from './types';
import './HomeLabDashboard.css';

type TabType = 'overview' | 'containers' | 'uptime' | 'network';

interface HomelabData {
  latest: HomelabSnapshot | null;
  history: HomelabHistory[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function CircularGauge({ value, max, label, color, unit }: { value: number; max: number; label: string; color: string; unit: string }) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" style={{ stroke: 'var(--ghost)' }} strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          strokeWidth="8" strokeLinecap="butt"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ stroke: color, transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" style={{ fill: 'var(--bone)' }} fontSize="16" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {percent.toFixed(0)}%
        </text>
        <text x="50" y="62" textAnchor="middle" style={{ fill: 'var(--dim)' }} fontSize="9" fontFamily="JetBrains Mono, monospace">
          {unit}
        </text>
      </svg>
      <div style={{ fontSize: '0.75rem', color: 'var(--dim)', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

function ResourceChart({ history }: { history: HomelabHistory[] }) {
  if (history.length < 2) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--dim)', fontSize: '0.8rem' }}>
        Waiting for history data...
      </div>
    );
  }

  const width = 700;
  const height = 120;
  const pad = { top: 10, right: 10, bottom: 20, left: 40 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const cpuPath = history.map((h, i) => {
    const x = pad.left + (i / (history.length - 1)) * cw;
    const y = pad.top + ch - (h.cpu / 100) * ch;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const ramPath = history.map((h, i) => {
    const x = pad.left + (i / (history.length - 1)) * cw;
    const y = pad.top + ch - (h.ram / 100) * ch;
    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
  }).join(' ');

  const yLabels = [0, 25, 50, 75, 100];
  const first = new Date(history[0].timestamp);
  const last = new Date(history[history.length - 1].timestamp);
  const xLabels = [first, new Date((first.getTime() + last.getTime()) / 2), last];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {yLabels.map(val => {
          const y = pad.top + ch - (val / 100) * ch;
          return (
            <g key={val}>
              <line x1={pad.left} y1={y} x2={pad.left + cw} y2={y} style={{ stroke: 'var(--ghost)' }} strokeWidth="1" />
              <text x={pad.left - 6} y={y} style={{ fill: 'var(--dim)' }} fontSize="8" textAnchor="end" dominantBaseline="middle">{val}%</text>
            </g>
          );
        })}
        {xLabels.map((d, i) => {
          const x = pad.left + (i / (xLabels.length - 1)) * cw;
          return (
            <text key={i} x={x} y={height - 4} style={{ fill: 'var(--dim)' }} fontSize="8" textAnchor="middle">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
          );
        })}
        <path d={cpuPath} fill="none" style={{ stroke: 'var(--bone)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ramPath} fill="none" style={{ stroke: 'var(--dim)' }} strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--bone)' }}>● CPU</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>● RAM</span>
      </div>
    </div>
  );
}

export default function HomeLabDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [data, setData] = useState<HomelabData>({ latest: null, history: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/homelab/data');
      if (!response.ok) throw new Error('Failed to fetch homelab data');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      console.error('Error fetching homelab data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const snapshot = data.latest;

  const containerStats = useMemo(() => {
    if (!snapshot) return { running: 0, stopped: 0, total: 0 };
    const running = snapshot.containers.filter(c => c.status === 'running').length;
    return { running, stopped: snapshot.containers.length - running, total: snapshot.containers.length };
  }, [snapshot]);

  const serviceStats = useMemo(() => {
    if (!snapshot) return { up: 0, down: 0, total: 0 };
    const up = snapshot.services.filter(s => s.status === 'up').length;
    return { up, down: snapshot.services.length - up, total: snapshot.services.length };
  }, [snapshot]);

  if (isLoading) {
    return (
      <div className="homelab-dashboard">
        <div className="homelab-loading">
          <div className="homelab-spinner" />
          <p>Loading home lab data...</p>
        </div>
      </div>
    );
  }

  const tabs: TabType[] = ['overview', 'containers', 'uptime', 'network'];

  return (
    <div className="homelab-dashboard">
      <a href="/" className="back-link" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        color: 'var(--dim)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1rem', transition: 'background 0.15s ease, color 0.15s ease',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Home
      </a>

      <header className="homelab-header">
        <div className="homelab-header-content">
          <h1>Home Lab Dashboard</h1>
          <p>Proxmox VE — Self-hosted infrastructure monitoring</p>
        </div>
        <div className="homelab-status">
          {snapshot ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="status-dot running" />
                <span style={{ fontSize: '0.875rem', color: 'var(--ink)' }}>Online</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>
                Updated: {new Date(snapshot.timestamp).toLocaleString()}
              </span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 8, height: 8, background: 'var(--dim)' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--dim)' }}>No data</span>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="homelab-error">
          <p>Error loading data: {error}</p>
          <button onClick={fetchData}>Retry</button>
        </div>
      )}

      <div className="homelab-grid">
        {/* Sidebar */}
        <div className="sidebar">
          <div className="homelab-card">
            <h2 className="homelab-card-title">Node</h2>
            {snapshot ? (
              <>
                <div style={{ textAlign: 'center', padding: '0.75rem 0', marginBottom: '0.75rem', borderBottom: '1px dashed var(--ghost)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bone)' }}>{snapshot.node.hostname}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--dim)', marginTop: '0.25rem' }}>
                    Uptime: {formatUptime(snapshot.node.uptime)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <CircularGauge value={snapshot.node.cpu} max={100} label="CPU" color="var(--bone)" unit={`${snapshot.node.cpu.toFixed(1)}%`} />
                  <CircularGauge value={snapshot.node.ram.used} max={snapshot.node.ram.total} label="RAM" color="var(--dim)" unit={formatBytes(snapshot.node.ram.used)} />
                </div>
                {snapshot.storage.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.2ch', marginBottom: '0.5rem' }}>Storage</div>
                    {snapshot.storage.map(pool => {
                      const percent = pool.total > 0 ? (pool.used / pool.total) * 100 : 0;
                      return (
                        <div key={pool.name} style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--ink)', marginBottom: '0.2rem' }}>
                            <span>{pool.name}</span>
                            <span>{formatBytes(pool.used)} / {formatBytes(pool.total)}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--ghost)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percent}%`, background: percent > 90 ? 'var(--color-negative)' : percent > 75 ? 'var(--bone)' : 'var(--dim)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {snapshot.node.kernel}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--dim)', fontSize: '0.85rem' }}>
                <p>Waiting for data...</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Run homelab-push.sh on your Proxmox server</p>
              </div>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="homelab-main">
          <nav className="tab-nav">
            {tabs.map(tab => (
              <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="homelab-card">
                  <h2 className="homelab-card-title">Containers</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-positive)' }}>{containerStats.running}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Running</div>
                    </div>
                    <div style={{ width: 1, height: 40, background: 'var(--ghost)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: containerStats.stopped > 0 ? 'var(--color-negative)' : 'var(--faint)' }}>{containerStats.stopped}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Stopped</div>
                    </div>
                  </div>
                  {snapshot && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                      {snapshot.containers.map(c => (
                        <span key={c.vmid} title={c.name} style={{
                          width: 8, height: 8,
                          background: c.status === 'running' ? 'var(--color-positive)' : 'var(--color-negative)',
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="homelab-card">
                  <h2 className="homelab-card-title">Services</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-positive)' }}>{serviceStats.up}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Online</div>
                    </div>
                    <div style={{ width: 1, height: 40, background: 'var(--ghost)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: serviceStats.down > 0 ? 'var(--color-negative)' : 'var(--faint)' }}>{serviceStats.down}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Offline</div>
                    </div>
                  </div>
                  {snapshot && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                      {snapshot.services.map((s, i) => (
                        <span key={i} title={s.name} style={{
                          width: 8, height: 8,
                          background: s.status === 'up' ? 'var(--color-positive)' : s.status === 'down' ? 'var(--color-negative)' : 'var(--dim)',
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                {snapshot && (
                  <div className="homelab-card">
                    <h2 className="homelab-card-title">Node Resources</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                      <CircularGauge value={snapshot.node.cpu} max={100} label="CPU" color="var(--bone)" unit={`${snapshot.node.cpu.toFixed(1)}%`} />
                      <CircularGauge
                        value={snapshot.node.ram.used} max={snapshot.node.ram.total}
                        label="RAM" color="var(--dim)"
                        unit={`${((snapshot.node.ram.used / snapshot.node.ram.total) * 100).toFixed(0)}%`}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Resource history chart */}
              <div className="homelab-card">
                <h2 className="homelab-card-title">Resource History</h2>
                <ResourceChart history={data.history} />
              </div>

              {/* Quick container list */}
              {snapshot && snapshot.containers.length > 0 && (
                <div className="homelab-card">
                  <h2 className="homelab-card-title">Container Status</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                    {snapshot.containers.map(c => (
                      <div key={c.vmid} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid var(--ghost)',
                      }}>
                        <span style={{ width: 8, height: 8, background: c.status === 'running' ? 'var(--color-positive)' : 'var(--color-negative)', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('containers')}
                    style={{
                      width: '100%', marginTop: '0.75rem', padding: '0.5rem',
                      background: 'transparent', border: '1px dashed var(--faint)',
                      color: 'var(--dim)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
                    }}
                  >
                    View detailed container metrics →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'containers' && snapshot && (
            <ContainerGrid containers={snapshot.containers} />
          )}
          {activeTab === 'containers' && !snapshot && (
            <div className="homelab-card">
              <div className="homelab-empty">
                <p>No container data available</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>Run homelab-push.sh on your Proxmox server</p>
              </div>
            </div>
          )}

          {activeTab === 'uptime' && snapshot && (
            <UptimeMonitor services={snapshot.services} />
          )}
          {activeTab === 'uptime' && !snapshot && (
            <div className="homelab-card">
              <div className="homelab-empty">
                <p>No uptime data available</p>
              </div>
            </div>
          )}

          {activeTab === 'network' && <NetworkTopology />}
        </div>
      </div>
    </div>
  );
}
