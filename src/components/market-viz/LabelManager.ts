import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of asset labels visible at once. */
const MAX_LABELS = 50;

/** Maximum sector cluster labels. */
const MAX_SECTOR_LABELS = 20;

/** Total pool size (asset labels + sector labels). */
const POOL_SIZE = MAX_LABELS + MAX_SECTOR_LABELS;

/** Minimum interval (ms) between updateVisibility calls. */
const VISIBILITY_THROTTLE_MS = 200;

// ---------------------------------------------------------------------------
// Label styling
// ---------------------------------------------------------------------------

const LABEL_STYLES: Partial<CSSStyleDeclaration> = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '10px',
  color: '#DCD7BA',
  background: 'rgba(31,31,40,0.8)',
  borderRadius: '4px',
  padding: '2px 6px',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

// ---------------------------------------------------------------------------
// LabelManager
// ---------------------------------------------------------------------------

/**
 * Distance-based label system using CSS2DRenderer.
 *
 * A fixed pool of DOM elements is recycled so we never create/destroy DOM
 * nodes during the render loop.
 */
export class LabelManager {
  private readonly renderer: CSS2DRenderer;

  // Pool of reusable label objects
  private readonly pool: { div: HTMLDivElement; obj: CSS2DObject }[] = [];

  // Currently active symbol list (set externally)
  private availableSymbols: string[] = [];

  // Sector labels (always visible when mode allows)
  private sectorLabels: { name: string; obj: CSS2DObject }[] = [];

  // Throttle bookkeeping
  private lastVisibilityUpdate = 0;

  constructor(container: HTMLElement) {
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.renderer.domElement);

    // Pre-create pooled labels
    for (let i = 0; i < POOL_SIZE; i++) {
      const div = document.createElement('div');
      div.className = 'market-viz-label';
      Object.assign(div.style, LABEL_STYLES);
      div.style.display = 'none';

      const obj = new CSS2DObject(div);
      obj.visible = false;
      this.pool.push({ div, obj });
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Provide the set of symbols that are eligible for labels. */
  setLabelsForSymbols(symbols: string[]): void {
    this.availableSymbols = symbols;
  }

  /**
   * Attach sector cluster labels to the scene.
   *
   * @param sectors Array of `{ name, position }` for each sector cluster.
   * @param scene   The Three.js scene to add CSS2D objects to.
   */
  setSectorLabels(
    sectors: { name: string; position: THREE.Vector3 }[],
    scene: THREE.Scene,
  ): void {
    // Remove old sector labels
    for (const sl of this.sectorLabels) {
      scene.remove(sl.obj);
    }
    this.sectorLabels = [];

    const count = Math.min(sectors.length, MAX_SECTOR_LABELS);
    for (let i = 0; i < count; i++) {
      const { name, position } = sectors[i];
      const div = document.createElement('div');
      div.className = 'market-viz-label market-viz-label--sector';
      Object.assign(div.style, LABEL_STYLES);
      div.style.fontSize = '11px';
      div.style.fontWeight = '600';
      div.textContent = name;

      const obj = new CSS2DObject(div);
      obj.position.copy(position);
      obj.position.y += 3; // Slightly above the cluster
      scene.add(obj);

      this.sectorLabels.push({ name, obj });
    }
  }

  /**
   * Show/hide labels based on distance to camera.
   *
   * Throttled to run at most once every {@link VISIBILITY_THROTTLE_MS}.
   */
  updateVisibility(
    camera: THREE.Camera,
    symbolPositions: Map<string, THREE.Vector3>,
    scene: THREE.Scene,
  ): void {
    const now = performance.now();
    if (now - this.lastVisibilityUpdate < VISIBILITY_THROTTLE_MS) return;
    this.lastVisibilityUpdate = now;

    const camPos = camera.position;

    // Build distance-sorted list from the available symbols
    const distEntries: { symbol: string; dist: number; pos: THREE.Vector3 }[] = [];

    for (const symbol of this.availableSymbols) {
      const pos = symbolPositions.get(symbol);
      if (!pos) continue;
      distEntries.push({ symbol, dist: camPos.distanceTo(pos), pos });
    }

    distEntries.sort((a, b) => a.dist - b.dist);

    // Hide all pool labels first
    for (const { div, obj } of this.pool) {
      div.style.display = 'none';
      obj.visible = false;
      // Remove from scene (we'll re-add active ones)
      if (obj.parent) obj.parent.remove(obj);
    }

    // Assign closest N symbols to the pool
    const count = Math.min(distEntries.length, MAX_LABELS);
    for (let i = 0; i < count; i++) {
      const entry = distEntries[i];
      const poolItem = this.pool[i];

      poolItem.div.textContent = entry.symbol;
      poolItem.div.style.display = '';
      poolItem.obj.visible = true;
      poolItem.obj.position.copy(entry.pos);
      poolItem.obj.position.y += 1.2; // Float above the cube
      scene.add(poolItem.obj);
    }
  }

  /** Render the CSS2D overlay. */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /** Update renderer size on container resize. */
  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  /** Remove the CSS2DRenderer DOM element and clean up. */
  dispose(): void {
    // Remove pooled objects from any parent
    for (const { obj } of this.pool) {
      if (obj.parent) obj.parent.remove(obj);
    }
    // Remove sector labels
    for (const { obj } of this.sectorLabels) {
      if (obj.parent) obj.parent.remove(obj);
    }

    this.renderer.domElement.remove();
  }
}
