export interface NodeMetrics {
  hostname: string;
  uptime: number;
  cpu: number;
  ram: { used: number; total: number };
  swap: { used: number; total: number };
  kernel: string;
}

export interface Container {
  vmid: number;
  name: string;
  type: 'lxc' | 'qemu';
  status: 'running' | 'stopped';
  cpu: number;
  ram: { used: number; total: number };
  disk: { used: number; total: number };
  uptime: number;
}

export interface ServiceCheck {
  name: string;
  url: string;
  status: 'up' | 'down' | 'unknown';
  responseTime: number;
  httpCode: number;
  lastChecked: string;
}

export interface StoragePool {
  name: string;
  type: string;
  used: number;
  total: number;
}

export interface HomelabSnapshot {
  timestamp: string;
  node: NodeMetrics;
  containers: Container[];
  services: ServiceCheck[];
  storage: StoragePool[];
}

export interface HomelabHistory {
  timestamp: string;
  cpu: number;
  ram: number;
}
