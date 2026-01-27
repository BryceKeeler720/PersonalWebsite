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
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text x="50" y="46" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="JetBrains Mono, monospace">
          {percent.toFixed(0)}%
        </text>
        <text x="50" y="62" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9" fontFamily="JetBrains Mono, monospace">
          {unit}
        </text>
      </svg>
      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '0.25rem' }}>{label}</div>
    </div>
  );
}

function ResourceChart({ history }: { history: HomelabHistory[] }) {
  if (history.length < 2) {
    return (
      <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>
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
              <line x1={pad.left} y1={y} x2={pad.left + cw} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={pad.left - 6} y={y} fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="end" dominantBaseline="middle">{val}%</text>
            </g>
          );
        })}
        {xLabels.map((d, i) => {
          const x = pad.left + (i / (xLabels.length - 1)) * cw;
          return (
            <text key={i} x={x} y={height - 4} fill="rgba(255,255,255,0.4)" fontSize="8" textAnchor="middle">
              {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </text>
          );
        })}
        <path d={cpuPath} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={ramPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#6366f1' }}>● CPU</span>
        <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>● RAM</span>
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
      <a href="/traditional" className="back-link" style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '1rem', transition: 'color 0.2s ease',
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
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>Online</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                Updated: {new Date(snapshot.timestamp).toLocaleString()}
              </span>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#64748b' }} />
              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>No data</span>
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
                <div style={{ textAlign: 'center', padding: '0.75rem 0', marginBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{snapshot.node.hostname}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>
                    Uptime: {formatUptime(snapshot.node.uptime)}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <CircularGauge value={snapshot.node.cpu} max={100} label="CPU" color="#6366f1" unit={`${snapshot.node.cpu.toFixed(1)}%`} />
                  <CircularGauge value={snapshot.node.ram.used} max={snapshot.node.ram.total} label="RAM" color="#22c55e" unit={formatBytes(snapshot.node.ram.used)} />
                </div>
                {snapshot.storage.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Storage</div>
                    {snapshot.storage.map(pool => {
                      const percent = pool.total > 0 ? (pool.used / pool.total) * 100 : 0;
                      return (
                        <div key={pool.name} style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.2rem' }}>
                            <span>{pool.name}</span>
                            <span>{formatBytes(pool.used)} / {formatBytes(pool.total)}</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${percent}%`, background: percent > 90 ? '#ef4444' : percent > 75 ? '#f59e0b' : '#22c55e', borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {snapshot.node.kernel}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
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
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{containerStats.running}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Running</div>
                    </div>
                    <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: containerStats.stopped > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>{containerStats.stopped}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Stopped</div>
                    </div>
                  </div>
                  {snapshot && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                      {snapshot.containers.map(c => (
                        <span key={c.vmid} title={c.name} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: c.status === 'running' ? '#22c55e' : '#ef4444',
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="homelab-card">
                  <h2 className="homelab-card-title">Services</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: '#22c55e' }}>{serviceStats.up}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Online</div>
                    </div>
                    <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 700, color: serviceStats.down > 0 ? '#ef4444' : 'rgba(255,255,255,0.3)' }}>{serviceStats.down}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Offline</div>
                    </div>
                  </div>
                  {snapshot && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.75rem', justifyContent: 'center' }}>
                      {snapshot.services.map((s, i) => (
                        <span key={i} title={s.name} style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: s.status === 'up' ? '#22c55e' : s.status === 'down' ? '#ef4444' : '#64748b',
                        }} />
                      ))}
                    </div>
                  )}
                </div>

                {snapshot && (
                  <div className="homelab-card">
                    <h2 className="homelab-card-title">Node Resources</h2>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                      <CircularGauge value={snapshot.node.cpu} max={100} label="CPU" color="#6366f1" unit={`${snapshot.node.cpu.toFixed(1)}%`} />
                      <CircularGauge
                        value={snapshot.node.ram.used} max={snapshot.node.ram.total}
                        label="RAM" color="#22c55e"
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
                        background: 'rgba(255,255,255,0.02)', borderRadius: 8,
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.status === 'running' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                        <span style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setActiveTab('containers')}
                    style={{
                      width: '100%', marginTop: '0.75rem', padding: '0.5rem',
                      background: 'transparent', border: '1px dashed rgba(255,255,255,0.2)',
                      borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.8rem',
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
