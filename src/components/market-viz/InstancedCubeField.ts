import * as THREE from 'three';
import type { InstanceEntry } from './dataTransforms';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INSTANCES = 7000;

// ---------------------------------------------------------------------------
// InstancedCubeField
// ---------------------------------------------------------------------------

/**
 * Manages a single `THREE.InstancedMesh` containing up to {@link MAX_INSTANCES}
 * unit cubes. Each instance can be independently positioned, scaled and colored.
 */
export class InstancedCubeField {
  readonly mesh: THREE.InstancedMesh;

  /** Symbol -> instance index (for raycasting reverse-lookup). */
  readonly symbolIndex = new Map<string, number>();

  /** Instance index -> symbol (for raycasting forward-lookup). */
  readonly indexToSymbol: string[] = [];

  // Shared resources
  private readonly geometry: THREE.BoxGeometry;
  private readonly material: THREE.MeshPhongMaterial;
  private readonly dummy = new THREE.Object3D();

  constructor() {
    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshPhongMaterial({
      transparent: true,
      opacity: 0.9,
    });

    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, MAX_INSTANCES);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;

    // Allow per-frame matrix updates
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Pre-allocate per-instance color buffer (RGB, 3 floats per instance)
    const colorArray = new Float32Array(MAX_INSTANCES * 3);
    const colorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
    colorAttr.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = colorAttr;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Rebuild the instance buffers from a flat array of entries.
   * Entries beyond {@link MAX_INSTANCES} are silently dropped.
   */
  update(entries: InstanceEntry[]): void {
    const count = Math.min(entries.length, MAX_INSTANCES);

    // Reset lookup tables
    this.symbolIndex.clear();
    this.indexToSymbol.length = 0;

    const colorAttr = this.mesh.instanceColor as THREE.InstancedBufferAttribute;

    for (let i = 0; i < count; i++) {
      const e = entries[i];

      // Lookup tables
      this.symbolIndex.set(e.symbol, i);
      this.indexToSymbol[i] = e.symbol;

      // Transform
      this.dummy.position.set(e.x, e.y, e.z);
      this.dummy.scale.setScalar(e.scale);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      // Color
      const base = i * 3;
      colorAttr.array[base] = e.r;
      colorAttr.array[base + 1] = e.g;
      colorAttr.array[base + 2] = e.b;
    }

    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  /** Resolve an instance index (from raycasting) to a symbol. */
  getSymbolAt(index: number): string | undefined {
    return this.indexToSymbol[index];
  }

  /** Get the world-space position of a symbol's cube, if it exists. */
  getPositionOf(symbol: string): THREE.Vector3 | undefined {
    const idx = this.symbolIndex.get(symbol);
    if (idx === undefined) return undefined;

    const mat = new THREE.Matrix4();
    this.mesh.getMatrixAt(idx, mat);
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(mat);
    return pos;
  }

  /** Release GPU resources. */
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
