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
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(34,197,94,0.1)', borderRadius: 8, flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{upCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Online</div>
        </div>
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 8, flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{downCount}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Offline</div>
        </div>
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8, flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>{services.length}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Total</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {services.map((svc, i) => {
          const statusColor = svc.status === 'up' ? '#22c55e' : svc.status === 'down' ? '#ef4444' : '#64748b';
          const statusBg = svc.status === 'up' ? 'rgba(34,197,94,0.1)' : svc.status === 'down' ? 'rgba(239,68,68,0.1)' : 'rgba(100,116,139,0.1)';

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: 8,
              borderLeft: `3px solid ${statusColor}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{svc.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {svc.url}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                {svc.status === 'up' && svc.responseTime > 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                    {svc.responseTime}ms
                  </span>
                )}
                <span style={{
                  padding: '0.2rem 0.5rem',
                  background: statusBg,
                  borderRadius: 4,
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
        <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          Last checked: {new Date(services[0].lastChecked).toLocaleString()}
        </div>
      )}
    </div>
  );
}
