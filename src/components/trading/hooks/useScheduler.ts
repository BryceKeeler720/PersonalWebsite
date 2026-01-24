import { useState, useCallback, useRef, useEffect } from 'react';
import type { SchedulerState } from '../types';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from '../../../lib/trading/storage';

const INTERVALS = {
  hourly: 60 * 60 * 1000, // 1 hour
  daily: 24 * 60 * 60 * 1000, // 24 hours
  manual: 0,
};

interface UseSchedulerOptions {
  interval: 'hourly' | 'daily' | 'manual';
  onExecute: () => Promise<void>;
}

/**
 * Custom hook for scheduling automated trading executions
 */
export function useScheduler({ interval, onExecute }: UseSchedulerOptions) {
  const [state, setState] = useState<SchedulerState>(() => {
    const saved = loadFromStorage<SchedulerState>(STORAGE_KEYS.SCHEDULER);
    return (
      saved || {
        isRunning: false,
        nextRun: null,
        lastRun: null,
      }
    );
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isExecutingRef = useRef(false);

  // Persist scheduler state
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SCHEDULER, state);
  }, [state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Execute the trading cycle
   */
  const execute = useCallback(async () => {
    if (isExecutingRef.current) return;

    isExecutingRef.current = true;

    try {
      await onExecute();
      setState(prev => ({
        ...prev,
        lastRun: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Scheduler execution error:', error);
    } finally {
      isExecutingRef.current = false;
    }
  }, [onExecute]);

  /**
   * Start the scheduler
   */
  const start = useCallback(async () => {
    if (interval === 'manual') {
      // Manual mode - just run once
      await execute();
      return;
    }

    const intervalMs = INTERVALS[interval];
    if (!intervalMs) return;

    // Execute immediately
    await execute();

    // Calculate next run time
    const nextRun = new Date(Date.now() + intervalMs).toISOString();

    // Set up interval
    intervalRef.current = setInterval(async () => {
      await execute();
      setState(prev => ({
        ...prev,
        nextRun: new Date(Date.now() + intervalMs).toISOString(),
      }));
    }, intervalMs);

    setState({
      isRunning: true,
      nextRun,
      lastRun: new Date().toISOString(),
    });
  }, [interval, execute]);

  /**
   * Stop the scheduler
   */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setState(prev => ({
      ...prev,
      isRunning: false,
      nextRun: null,
    }));
  }, []);

  /**
   * Run once manually (without affecting scheduler state)
   */
  const runOnce = useCallback(async () => {
    await execute();
  }, [execute]);

  /**
   * Get time until next run
   */
  const getTimeUntilNextRun = useCallback((): string | null => {
    if (!state.nextRun) return null;

    const now = Date.now();
    const next = new Date(state.nextRun).getTime();
    const diff = next - now;

    if (diff <= 0) return 'Now';

    const hours = Math.floor(diff / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((diff % (60 * 1000)) / 1000);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, [state.nextRun]);

  return {
    state,
    start,
    stop,
    runOnce,
    isExecuting: isExecutingRef.current,
    getTimeUntilNextRun,
  };
}
