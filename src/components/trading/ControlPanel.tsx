import React, { useState, useEffect } from 'react';
import type { SchedulerState } from './types';

interface ControlPanelProps {
  schedulerState: SchedulerState;
  onStart: () => void;
  onStop: () => void;
  onRunOnce: () => void;
  onReset: () => void;
  isAnalyzing: boolean;
}

export default function ControlPanel({
  schedulerState,
  onStart,
  onStop,
  onRunOnce,
  onReset,
  isAnalyzing,
}: ControlPanelProps) {
  const [timeUntilNext, setTimeUntilNext] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Update countdown timer
  useEffect(() => {
    if (!schedulerState.nextRun) {
      setTimeUntilNext(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const next = new Date(schedulerState.nextRun!).getTime();
      const diff = next - now;

      if (diff <= 0) {
        setTimeUntilNext('Now');
        return;
      }

      const hours = Math.floor(diff / (60 * 60 * 1000));
      const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);

      if (hours > 0) {
        setTimeUntilNext(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeUntilNext(`${minutes}m ${seconds}s`);
      } else {
        setTimeUntilNext(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [schedulerState.nextRun]);

  const handleReset = () => {
    if (showResetConfirm) {
      onReset();
      setShowResetConfirm(false);
    } else {
      setShowResetConfirm(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowResetConfirm(false), 3000);
    }
  };

  return (
    <div className="control-panel">
      {/* Scheduler Status */}
      <div className="scheduler-status">
        <span className={`dot ${schedulerState.isRunning ? 'running' : 'stopped'}`} />
        {schedulerState.isRunning ? (
          <span>Auto-trading: Next in {timeUntilNext || '...'}</span>
        ) : (
          <span>Auto-trading paused</span>
        )}
      </div>

      {/* Control Buttons */}
      {schedulerState.isRunning ? (
        <button className="control-btn danger" onClick={onStop} disabled={isAnalyzing}>
          Stop Auto-Trade
        </button>
      ) : (
        <button className="control-btn primary" onClick={onStart} disabled={isAnalyzing}>
          Start Auto-Trade
        </button>
      )}

      <button className="control-btn secondary" onClick={onRunOnce} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
      </button>

      <button
        className={`control-btn ${showResetConfirm ? 'danger' : 'secondary'}`}
        onClick={handleReset}
        disabled={isAnalyzing}
      >
        {showResetConfirm ? 'Confirm Reset' : 'Reset'}
      </button>

      {/* Last Run */}
      {schedulerState.lastRun && (
        <span
          style={{
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.4)',
          }}
        >
          Last: {new Date(schedulerState.lastRun).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
