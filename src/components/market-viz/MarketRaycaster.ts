import * as THREE from 'three';
import type { InstancedCubeField } from './InstancedCubeField';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RaycasterCallbacks {
  onHover: (symbol: string | null) => void;
  onClick: (symbol: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum interval between pointer-move raycasts (ms). */
const THROTTLE_MS = 50;

// ---------------------------------------------------------------------------
// MarketRaycaster
// ---------------------------------------------------------------------------

/**
 * Provides hover and click detection on the instanced cube field by
 * raycasting from the pointer position.
 */
export class MarketRaycaster {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();

  private readonly camera: THREE.Camera;
  private readonly cubeField: InstancedCubeField;
  private readonly container: HTMLElement;
  private readonly callbacks: RaycasterCallbacks;

  private enabled = true;
  private lastHoveredSymbol: string | null = null;
  private lastMoveTime = 0;

  // Bound handlers (needed for removeEventListener)
  private readonly handlePointerMove: (e: PointerEvent) => void;
  private readonly handlePointerDown: (e: PointerEvent) => void;

  constructor(
    camera: THREE.Camera,
    cubeField: InstancedCubeField,
    container: HTMLElement,
    callbacks: RaycasterCallbacks,
  ) {
    this.camera = camera;
    this.cubeField = cubeField;
    this.container = container;
    this.callbacks = callbacks;

    this.handlePointerMove = this.onPointerMove.bind(this);
    this.handlePointerDown = this.onPointerDown.bind(this);

    container.addEventListener('pointermove', this.handlePointerMove);
    container.addEventListener('pointerdown', this.handlePointerDown);
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Enable or disable raycasting (e.g. during camera fly-to animations). */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.lastHoveredSymbol !== null) {
      this.lastHoveredSymbol = null;
      this.callbacks.onHover(null);
    }
  }

  /** Remove event listeners. */
  dispose(): void {
    this.container.removeEventListener('pointermove', this.handlePointerMove);
    this.container.removeEventListener('pointerdown', this.handlePointerDown);
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private updatePointer(e: PointerEvent): void {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private castRay(): string | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.cubeField.mesh, false);
    if (hits.length === 0) return null;

    const instanceId = hits[0].instanceId;
    if (instanceId === undefined) return null;

    return this.cubeField.getSymbolAt(instanceId) ?? null;
  }

  // -- Event handlers -----------------------------------------------------

  private onPointerMove(e: PointerEvent): void {
    if (!this.enabled) return;

    const now = performance.now();
    if (now - this.lastMoveTime < THROTTLE_MS) return;
    this.lastMoveTime = now;

    this.updatePointer(e);
    const symbol = this.castRay();

    if (symbol !== this.lastHoveredSymbol) {
      this.lastHoveredSymbol = symbol;
      this.callbacks.onHover(symbol);
    }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.enabled) return;

    this.updatePointer(e);
    const symbol = this.castRay();
    if (symbol) {
      this.callbacks.onClick(symbol);
    }
  }
}
