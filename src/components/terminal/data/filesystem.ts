export interface FSNode {
  type: 'dir' | 'file';
  children?: Record<string, FSNode>;
  content?: string;
}

export const filesystem: FSNode = {
  type: 'dir',
  children: {
    home: {
      type: 'dir',
      children: {
        bryce: {
          type: 'dir',
          children: {
            'about.txt': {
              type: 'file',
              content: [
                'Bryce Keeler',
                'Software Engineer & Data Scientist',
                '',
                'Analyst at Huron Consulting Group.',
                'UT Dallas \'24 - B.S. Computer Information Systems.',
                'Currently pursuing MIT MicroMasters in Statistics and Data Science.',
                '',
                'Interests: ML engineering, algorithmic trading, home labs.',
              ].join('\n'),
            },
            'contact.txt': {
              type: 'file',
              content: [
                'Email:    Bryce@BryceKeeler.com',
                'GitHub:   github.com/BryceKeeler720',
                'LinkedIn: linkedin.com/in/bryce-keeler720',
                'Website:  brycekeeler.com',
              ].join('\n'),
            },
            'resume.txt': {
              type: 'file',
              content: [
                'View full resume at: /resume',
                '',
                'Download SWE resume: /Bryce_Keeler_Resume_2026_SWE.pdf',
                'Download DS resume:  /Bryce_Keeler_Resume_2026_DS.pdf',
              ].join('\n'),
            },
            projects: {
              type: 'dir',
              children: {
                'trading-bot.txt': {
                  type: 'file',
                  content: [
                    'Algorithmic Trading Bot',
                    '----------------------',
                    'ML-powered multi-asset trading system.',
                    '5 strategy groups, scans 2000+ assets.',
                    'Stack: React, TypeScript, ML, Alpaca API',
                    'Live: /TradingBot',
                  ].join('\n'),
                },
                'nutrione.txt': {
                  type: 'file',
                  content: [
                    'NutriOne',
                    '--------',
                    'Full-stack nutrition tracking with food recognition.',
                    'Custom YOLOv8 model trained on ~101k food images.',
                    'Stack: FastAPI, PostgreSQL, React, YOLOv8',
                  ].join('\n'),
                },
                'plant-monitor.txt': {
                  type: 'file',
                  content: [
                    'Plant Health Monitor',
                    '--------------------',
                    'IoT + ML pipeline with ESP32 sensors.',
                    'LSTM predictions for watering needs.',
                    'Stack: ESP32, PyTorch, TimescaleDB, MQTT',
                  ].join('\n'),
                },
                'homelab.txt': {
                  type: 'file',
                  content: [
                    'Home Lab',
                    '--------',
                    'Proxmox server with 15+ containers/VMs.',
                    'Pi-hole, Tailscale, Jellyfin, Grafana, and more.',
                    'Live: /HomeLab',
                  ].join('\n'),
                },
              },
            },
          },
        },
      },
    },
  },
};

export const HOME_DIR = '/home/bryce';

export function resolvePath(currentDir: string, target: string): string {
  if (target.startsWith('/')) {
    return normalizePath(target);
  }

  const parts = currentDir.split('/').filter(Boolean);
  const targetParts = target.split('/').filter(Boolean);

  for (const part of targetParts) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }

  return '/' + parts.join('/');
}

function normalizePath(path: string): string {
  const parts = path.split('/').filter(Boolean);
  const resolved: string[] = [];

  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else if (part !== '.') {
      resolved.push(part);
    }
  }

  return '/' + resolved.join('/');
}

export function getNode(path: string): FSNode | null {
  if (path === '/') return filesystem;

  const parts = path.split('/').filter(Boolean);
  let current: FSNode = filesystem;

  for (const part of parts) {
    if (current.type !== 'dir' || !current.children?.[part]) {
      return null;
    }
    current = current.children[part];
  }

  return current;
}
