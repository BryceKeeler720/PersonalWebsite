interface NetworkNode {
  id: string;
  label: string;
  vlan: string;
  icon: 'server' | 'shield' | 'globe' | 'database' | 'monitor' | 'router' | 'cloud';
}

interface NetworkLink {
  from: string;
  to: string;
  label?: string;
}

interface VLAN {
  name: string;
  subnet: string;
  color: string;
}

// Hardcoded topology — edit when network changes
const VLANS: VLAN[] = [
  { name: 'Management', subnet: '10.0.0.0/24', color: '#7E9CD8' },
  { name: 'Servers', subnet: '10.0.10.0/24', color: '#76946A' },
  { name: 'IoT', subnet: '10.0.20.0/24', color: '#C0A36E' },
  { name: 'Personal', subnet: '10.0.30.0/24', color: '#957FB8' },
];

const NODES: NetworkNode[] = [
  { id: 'proxmox', label: 'Proxmox VE', vlan: 'Management', icon: 'server' },
  { id: 'router', label: 'Router', vlan: 'Management', icon: 'router' },
  { id: 'pihole', label: 'Pi-hole DNS', vlan: 'Servers', icon: 'shield' },
  { id: 'nginx', label: 'Nginx Proxy', vlan: 'Servers', icon: 'globe' },
  { id: 'jellyfin', label: 'Jellyfin', vlan: 'Servers', icon: 'monitor' },
  { id: 'postgres', label: 'PostgreSQL', vlan: 'Servers', icon: 'database' },
  { id: 'fastapi', label: 'FastAPI Apps', vlan: 'Servers', icon: 'globe' },
  { id: 'grafana', label: 'Grafana', vlan: 'Servers', icon: 'monitor' },
  { id: 'truenas', label: 'TrueNAS', vlan: 'Servers', icon: 'database' },
  { id: 'uptime', label: 'Uptime Kuma', vlan: 'Servers', icon: 'monitor' },
  { id: 'tailscale', label: 'Tailscale', vlan: 'Management', icon: 'cloud' },
  { id: 'iot-devices', label: 'IoT Devices', vlan: 'IoT', icon: 'monitor' },
  { id: 'personal', label: 'Personal Devices', vlan: 'Personal', icon: 'monitor' },
];

const LINKS: NetworkLink[] = [
  { from: 'router', to: 'proxmox', label: 'VLAN trunk' },
  { from: 'router', to: 'pihole', label: 'DNS' },
  { from: 'nginx', to: 'jellyfin' },
  { from: 'nginx', to: 'fastapi' },
  { from: 'nginx', to: 'grafana' },
  { from: 'nginx', to: 'uptime' },
  { from: 'proxmox', to: 'truenas', label: 'NFS/SMB' },
  { from: 'fastapi', to: 'postgres' },
  { from: 'tailscale', to: 'proxmox', label: 'VPN mesh' },
  { from: 'pihole', to: 'personal' },
  { from: 'pihole', to: 'iot-devices' },
];

function NodeIcon({ icon, color }: { icon: NetworkNode['icon']; color: string }) {
  const size = 16;
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (icon) {
    case 'server': return <svg {...props}><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><circle cx="6" cy="6" r="1" fill={color} /><circle cx="6" cy="18" r="1" fill={color} /></svg>;
    case 'shield': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    case 'globe': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
    case 'database': return <svg {...props}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>;
    case 'monitor': return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></svg>;
    case 'router': return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="7" cy="12" r="1" fill={color} /><path d="M13 12h6" /></svg>;
    case 'cloud': return <svg {...props}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></svg>;
  }
}

export default function NetworkTopology() {
  const vlanNodes = VLANS.map(vlan => ({
    ...vlan,
    nodes: NODES.filter(n => n.vlan === vlan.name),
  }));

  return (
    <div className="homelab-card">
      <h2 className="homelab-card-title">Network Topology</h2>
      <p style={{ fontSize: '0.8rem', color: 'rgba(220,215,186,0.5)', margin: '0 0 1.25rem' }}>
        VLAN-segmented network with isolated zones for servers, IoT, and personal devices.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {vlanNodes.map(vlan => (
          <div key={vlan.name} style={{
            padding: '1rem',
            background: `${vlan.color}08`,
            border: `1px solid ${vlan.color}25`,
            borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{ width: 3, height: 20, background: vlan.color, borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: vlan.color }}>{vlan.name}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(220,215,186,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>{vlan.subnet}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {vlan.nodes.map(node => {
                const outgoing = LINKS.filter(l => l.from === node.id);
                return (
                  <div key={node.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    background: 'rgba(220,215,186,0.04)',
                    borderRadius: 8,
                    border: '1px solid rgba(220,215,186,0.08)',
                  }}>
                    <NodeIcon icon={node.icon} color={vlan.color} />
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--kana-fg)' }}>{node.label}</div>
                      {outgoing.length > 0 && (
                        <div style={{ fontSize: '0.65rem', color: 'rgba(220,215,186,0.35)' }}>
                          → {outgoing.map(l => NODES.find(n => n.id === l.to)?.label).filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(220,215,186,0.02)', borderRadius: 8 }}>
        <div style={{ fontSize: '0.7rem', color: 'rgba(220,215,186,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Key Connections</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {LINKS.filter(l => l.label).map((link, i) => {
            const from = NODES.find(n => n.id === link.from);
            const to = NODES.find(n => n.id === link.to);
            if (!from || !to) return null;
            return (
              <div key={i} style={{ fontSize: '0.7rem', color: 'rgba(220,215,186,0.6)', padding: '0.25rem 0.5rem', background: 'rgba(220,215,186,0.04)', borderRadius: 4 }}>
                {from.label} → {to.label} <span style={{ color: 'rgba(220,215,186,0.35)' }}>({link.label})</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
