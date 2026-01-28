import { useState } from 'react';
import type { Container } from './types';

interface ContainerGridProps {
  containers: Container[];
}

type SortKey = 'name' | 'status' | 'cpu' | 'ram';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function UsageBar({ used, total, color }: { used: number; total: number; color: string }) {
  const percent = total > 0 ? (used / total) * 100 : 0;
  return (
    <div style={{ height: 4, background: 'rgba(220,215,186,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(percent, 100)}%`, background: color, borderRadius: 2, transition: 'width 0.3s ease' }} />
    </div>
  );
}

export default function ContainerGrid({ containers }: ContainerGridProps) {
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const sorted = [...containers].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'status': return (a.status === 'running' ? 0 : 1) - (b.status === 'running' ? 0 : 1);
      case 'cpu': return b.cpu - a.cpu;
      case 'ram': return (b.ram.total > 0 ? b.ram.used / b.ram.total : 0) - (a.ram.total > 0 ? a.ram.used / a.ram.total : 0);
      default: return 0;
    }
  });

  return (
    <div className="homelab-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 className="homelab-card-title">Containers &amp; VMs ({containers.length})</h2>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {(['name', 'status', 'cpu', 'ram'] as SortKey[]).map(key => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                padding: '0.25rem 0.5rem',
                background: sortBy === key ? 'rgba(220,215,186,0.12)' : 'rgba(220,215,186,0.05)',
                border: `1px solid ${sortBy === key ? 'rgba(220,215,186,0.25)' : 'rgba(220,215,186,0.1)'}`,
                borderRadius: 6,
                color: sortBy === key ? 'var(--kana-fg)' : 'rgba(220,215,186,0.5)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
        {sorted.map(ct => {
          const ramPercent = ct.ram.total > 0 ? (ct.ram.used / ct.ram.total) * 100 : 0;
          const diskPercent = ct.disk.total > 0 ? (ct.disk.used / ct.disk.total) * 100 : 0;
          const isRunning = ct.status === 'running';

          return (
            <div key={ct.vmid} style={{
              padding: '1rem',
              background: 'rgba(220,215,186,0.02)',
              borderRadius: 12,
              border: `1px solid ${isRunning ? 'rgba(118,148,106,0.15)' : 'rgba(195,64,67,0.15)'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--kana-fg)', fontSize: '0.9rem' }}>{ct.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(220,215,186,0.4)', display: 'flex', gap: '0.5rem', marginTop: '0.15rem' }}>
                    <span>VMID {ct.vmid}</span>
                    <span style={{
                      padding: '0.1rem 0.35rem',
                      background: ct.type === 'lxc' ? 'rgba(126,156,216,0.15)' : 'rgba(192,163,110,0.15)',
                      color: ct.type === 'lxc' ? '#7E9CD8' : '#C0A36E',
                      borderRadius: 3,
                      fontSize: '0.65rem',
                      fontWeight: 600,
                    }}>
                      {ct.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.2rem 0.5rem',
                  background: isRunning ? 'rgba(118,148,106,0.15)' : 'rgba(195,64,67,0.15)',
                  borderRadius: 4,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: isRunning ? '#76946A' : '#C34043' }} />
                  <span style={{ fontSize: '0.7rem', color: isRunning ? '#76946A' : '#C34043', fontWeight: 600 }}>
                    {isRunning ? 'Running' : 'Stopped'}
                  </span>
                </div>
              </div>

              {isRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(220,215,186,0.5)', marginBottom: '0.2rem' }}>
                      <span>CPU</span>
                      <span>{ct.cpu.toFixed(1)}%</span>
                    </div>
                    <UsageBar used={ct.cpu} total={100} color="#7E9CD8" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(220,215,186,0.5)', marginBottom: '0.2rem' }}>
                      <span>RAM</span>
                      <span>{formatBytes(ct.ram.used)} / {formatBytes(ct.ram.total)} ({ramPercent.toFixed(0)}%)</span>
                    </div>
                    <UsageBar used={ct.ram.used} total={ct.ram.total} color="#76946A" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(220,215,186,0.5)', marginBottom: '0.2rem' }}>
                      <span>Disk</span>
                      <span>{formatBytes(ct.disk.used)} / {formatBytes(ct.disk.total)} ({diskPercent.toFixed(0)}%)</span>
                    </div>
                    <UsageBar used={ct.disk.used} total={ct.disk.total} color="#C0A36E" />
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(220,215,186,0.4)', marginTop: '0.25rem' }}>
                    Uptime: {formatUptime(ct.uptime)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
