const STORAGE_PREFIX = 'tradingbot_';

export function loadFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (!item) return null;
    return JSON.parse(item) as T;
  } catch (error) {
    console.error(`Error loading ${key} from storage:`, error);
    return null;
  }
}

export function saveToStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving ${key} to storage:`, error);
  }
}

export function removeFromStorage(key: string): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.error(`Error removing ${key} from storage:`, error);
  }
}

export function clearAllStorage(): void {
  if (typeof window === 'undefined') return;

  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}

// Storage keys
export const STORAGE_KEYS = {
  PORTFOLIO: 'portfolio',
  TRADES: 'trades',
  CONFIG: 'config',
  SCHEDULER: 'scheduler',
} as const;
