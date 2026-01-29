import type { InstanceEntry } from './dataTransforms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TweenTarget {
  x: number;
  y: number;
  z: number;
  scale: number;
  r: number;
  g: number;
  b: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Convergence threshold -- below this delta a value is considered "arrived". */
const EPSILON = 0.001;

// ---------------------------------------------------------------------------
// TweenManager
// ---------------------------------------------------------------------------

/**
 * Per-symbol exponential-smoothing interpolation manager.
 *
 * Each symbol has a *current* state that is lerped toward a *target* state
 * every tick. New symbols snap to their target immediately so there is no
 * "fly-in from origin" artifact.
 */
export class TweenManager {
  readonly current = new Map<string, TweenTarget>();
  readonly target = new Map<string, TweenTarget>();

  /** Exponential smoothing factor (0 < f < 1). Higher = faster. */
  lerpFactor = 0.08;

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Set the target for a symbol. If the symbol is new, snap immediately. */
  setTarget(symbol: string, t: TweenTarget): void {
    this.target.set(symbol, t);

    if (!this.current.has(symbol)) {
      // First time -- snap to target so we don't interpolate from (0,0,0).
      this.current.set(symbol, { ...t });
    }
  }

  /** Remove a symbol from both maps. */
  removeSymbol(symbol: string): void {
    this.current.delete(symbol);
    this.target.delete(symbol);
  }

  /**
   * Advance one frame.
   *
   * Interpolates every symbol's current value toward its target and returns
   * the full list of current values as `InstanceEntry[]`.
   */
  tick(): InstanceEntry[] {
    const entries: InstanceEntry[] = [];
    const f = this.lerpFactor;

    for (const [symbol, tgt] of this.target) {
      let cur = this.current.get(symbol);
      if (!cur) {
        cur = { ...tgt };
        this.current.set(symbol, cur);
      }

      cur.x += (tgt.x - cur.x) * f;
      cur.y += (tgt.y - cur.y) * f;
      cur.z += (tgt.z - cur.z) * f;
      cur.scale += (tgt.scale - cur.scale) * f;
      cur.r += (tgt.r - cur.r) * f;
      cur.g += (tgt.g - cur.g) * f;
      cur.b += (tgt.b - cur.b) * f;

      entries.push({
        symbol,
        x: cur.x,
        y: cur.y,
        z: cur.z,
        scale: cur.scale,
        r: cur.r,
        g: cur.g,
        b: cur.b,
      });
    }

    return entries;
  }

  /**
   * Returns `true` when at least one symbol has not yet converged to its
   * target (any property delta exceeds EPSILON).
   */
  hasActiveAnimations(): boolean {
    for (const [symbol, tgt] of this.target) {
      const cur = this.current.get(symbol);
      if (!cur) return true;

      if (
        Math.abs(cur.x - tgt.x) > EPSILON ||
        Math.abs(cur.y - tgt.y) > EPSILON ||
        Math.abs(cur.z - tgt.z) > EPSILON ||
        Math.abs(cur.scale - tgt.scale) > EPSILON ||
        Math.abs(cur.r - tgt.r) > EPSILON ||
        Math.abs(cur.g - tgt.g) > EPSILON ||
        Math.abs(cur.b - tgt.b) > EPSILON
      ) {
        return true;
      }
    }
    return false;
  }
}
