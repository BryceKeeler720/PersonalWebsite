import { Redis } from '@upstash/redis';
import type { HomelabSnapshot, HomelabHistory } from '../../components/homelab/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const KEYS = {
  LATEST: 'homelab:latest',
  HISTORY: 'homelab:history_list',
};

export async function getHomelabLatest(): Promise<HomelabSnapshot | null> {
  try {
    return await redis.get<HomelabSnapshot>(KEYS.LATEST);
  } catch (error) {
    console.error('Error getting homelab latest:', error);
    return null;
  }
}

export async function getHomelabHistory(): Promise<HomelabHistory[]> {
  try {
    const raw = await redis.lrange(KEYS.HISTORY, 0, -1);
    if (!raw || raw.length === 0) return [];
    return raw.map((entry) => {
      if (typeof entry === 'string') return JSON.parse(entry) as HomelabHistory;
      return entry as HomelabHistory;
    });
  } catch (error) {
    console.error('Error getting homelab history:', error);
    return [];
  }
}
