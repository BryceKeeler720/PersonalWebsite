import type { ServiceCheck } from './types';

interface UptimeMonitorProps {
  services: ServiceCheck[];
}

export default function UptimeMonitor({ services }: UptimeMonitorProps) {
  const upCount = services.filter(s => s.status === 'up').length;
  const downCount = services.filter(s => s.status === 'down').length;

  return (
    <div className="homelab-card">
      <h2 className="homelab-card-title">Service Uptime</h2>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
        <div style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-positive)', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-positive)' }}>{upCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Online</div>
        </div>
        <div style={{ padding: '0.75rem 1rem', border: '1px solid var(--color-negative)', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-negative)' }}>{downCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Offline</div>
        </div>
        <div style={{ padding: '0.75rem 1rem', border: '1px solid var(--faint)', flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--bone)' }}>{services.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--dim)' }}>Total</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {services.map((svc, i) => {
          const statusColor = svc.status === 'up' ? 'var(--color-positive)' : svc.status === 'down' ? 'var(--color-negative)' : 'var(--dim)';

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'transparent',
              borderBottom: '1px dashed var(--ghost)',
              borderLeft: `2px solid ${statusColor}`,
            }}>
              <span style={{ width: 8, height: 8, background: statusColor, flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--bone)', fontSize: '0.85rem' }}>{svc.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {svc.url}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {svc.status === 'up' && svc.responseTime > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--dim)' }}>
                    {svc.responseTime}ms
                  </span>
                )}
                <span style={{
                  padding: '0.2rem 0.5rem',
                  background: 'transparent',
                  border: `1px solid ${statusColor}`,
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: statusColor,
                  textTransform: 'uppercase',
                }}>
                  {svc.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {services.length > 0 && services[0].lastChecked && (
        <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'var(--dim)', textAlign: 'center' }}>
          Last checked: {new Date(services[0].lastChecked).toLocaleString()}
        </div>
      )}
    </div>
  );
}
