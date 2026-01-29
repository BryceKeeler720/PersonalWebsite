import React from 'react';

interface ConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected';
  lastUpdate?: string;
}

function timeSince(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const STATUS_LABELS: Record<ConnectionStatusProps['status'], string> = {
  connected: 'Live',
  connecting: 'Connecting...',
  disconnected: 'Offline',
};

export default function ConnectionStatus({ status, lastUpdate }: ConnectionStatusProps) {
  return (
    <div className="connection-status market-panel">
      <span className={`status-dot ${status}`} />
      <span className="status-text">{STATUS_LABELS[status]}</span>
      {lastUpdate && <span className="last-update">{timeSince(lastUpdate)}</span>}
    </div>
  );
}
