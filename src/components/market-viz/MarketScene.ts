import * as THREE from 'three';
import type { SignalSnapshot, AssetMetric } from '../trading/types';
import { InstancedCubeField } from './InstancedCubeField';
import { CameraController } from './CameraController';
import { MarketRaycaster } from './MarketRaycaster';
import { LabelManager } from './LabelManager';
import { TweenManager } from './TweenManager';
import {
  transformToInstances,
  type FilterState,
  type LayoutMode,
} from './dataTransforms';
import {
  getPreset,
  type PresetName,
  type PresetConfig,
} from './PresetManager';
import { CLUSTER_POSITIONS } from '../../lib/trading/sectorMap';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SceneCallbacks {
  onHover: (symbol: string | null) => void;
  onClick: (symbol: string) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRID_SIZE = 200;
const GRID_DIVISIONS = 200;
const GRID_COLOR = 0x363646; // Kanagawa dim

// ---------------------------------------------------------------------------
// MarketScene
// ---------------------------------------------------------------------------

/**
 * Pure imperative Three.js scene manager for the 3D market visualization.
 *
 * No React -- the constructor takes a plain DOM container and lifecycle is
 * managed via {@link dispose}.
 */
export class MarketScene {
  // Core Three.js objects
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;

  // Sub-systems
  private readonly cubeField: InstancedCubeField;
  private readonly cameraCtrl: CameraController;
  private readonly raycaster: MarketRaycaster;
  private readonly labelMgr: LabelManager;
  private readonly tweenMgr: TweenManager;

  // State
  private animationFrameId: number | null = null;
  private readonly container: HTMLElement;
  private readonly resizeObserver: ResizeObserver;
  private readonly clock = new THREE.Clock();
  private currentLayout: LayoutMode = 'cluster';
  private lastHoveredSymbol: string | null = null;
  private readonly callbacks: SceneCallbacks;

  // -----------------------------------------------------------------------
  // Constructor
  // -----------------------------------------------------------------------

  constructor(container: HTMLElement, callbacks: SceneCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    // -- Renderer ----------------------------------------------------------
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // -- Scene ------------------------------------------------------------
    this.scene = new THREE.Scene();

    // -- Camera -----------------------------------------------------------
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 40, 80);

    // -- Lights -----------------------------------------------------------
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(50, 80, 40); // top-right
    this.scene.add(directional);

    // -- Grid -------------------------------------------------------------
    const grid = new THREE.GridHelper(GRID_SIZE, GRID_DIVISIONS, GRID_COLOR, GRID_COLOR);
    this.scene.add(grid);

    // -- Sub-systems ------------------------------------------------------
    this.cubeField = new InstancedCubeField();
    this.scene.add(this.cubeField.mesh);

    this.tweenMgr = new TweenManager();

    this.cameraCtrl = new CameraController(this.camera, this.renderer.domElement);
    this.cameraCtrl.onFlyStateChange = (flying) => {
      this.raycaster.setEnabled(!flying);
    };

    this.raycaster = new MarketRaycaster(this.camera, this.cubeField, container, {
      onHover: (symbol) => {
        this.lastHoveredSymbol = symbol;
        callbacks.onHover(symbol);
      },
      onClick: (symbol) => {
        callbacks.onClick(symbol);
      },
    });

    this.labelMgr = new LabelManager(container);

    // Populate sector cluster labels from the shared map
    this.initSectorLabels();

    // -- Resize -----------------------------------------------------------
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);

    // -- Start render loop ------------------------------------------------
    this.clock.start();
    this.animate();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Push new market data into the visualization.
   */
  updateData(
    signals: SignalSnapshot[],
    metrics: Map<string, AssetMetric>,
    filters: FilterState,
  ): void {
    const entries = transformToInstances(signals, metrics, filters, this.currentLayout);

    // Collect the set of symbols present in this update
    const activeSymbols = new Set<string>();
    for (const entry of entries) {
      activeSymbols.add(entry.symbol);
      this.tweenMgr.setTarget(entry.symbol, {
        x: entry.x,
        y: entry.y,
        z: entry.z,
        scale: entry.scale,
        r: entry.r,
        g: entry.g,
        b: entry.b,
      });
    }

    // Remove symbols that are no longer in the data set
    for (const sym of this.tweenMgr.target.keys()) {
      if (!activeSymbols.has(sym)) {
        this.tweenMgr.removeSymbol(sym);
      }
    }

    // Update label pool
    this.labelMgr.setLabelsForSymbols(entries.map((e) => e.symbol));
  }

  /**
   * Switch to a named camera / filter preset.
   */
  applyPreset(preset: PresetName): void {
    const cfg: PresetConfig = getPreset(preset);
    this.cameraCtrl.applyPreset(cfg);
    this.currentLayout = cfg.layoutMode ?? 'cluster';
  }

  /**
   * Fly the camera to a specific symbol's cube.
   */
  flyTo(symbol: string): void {
    const pos = this.cubeField.getPositionOf(symbol);
    if (!pos) return;

    // Offset the camera a bit away so the cube isn't clipped
    const offset = new THREE.Vector3(0, 8, 15);
    const camTarget = pos.clone();
    const camPos = pos.clone().add(offset);

    this.cameraCtrl.flyTo(camPos, camTarget);
  }

  /** Returns the currently hovered symbol (if any). */
  getHoveredSymbol(): string | null {
    return this.lastHoveredSymbol;
  }

  /** Full cleanup -- call when unmounting. */
  dispose(): void {
    // Stop render loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.resizeObserver.disconnect();
    this.raycaster.dispose();
    this.cameraCtrl.dispose();
    this.labelMgr.dispose();
    this.cubeField.dispose();

    // Dispose renderer and remove its canvas
    this.renderer.dispose();
    this.renderer.domElement.remove();

    // Walk scene and dispose any remaining geometry/material
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat?.dispose();
        }
      }
    });
  }

  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------

  private initSectorLabels(): void {
    const sectors: { name: string; position: THREE.Vector3 }[] = [];
    for (const [, cluster] of Object.entries(CLUSTER_POSITIONS)) {
      sectors.push({
        name: cluster.label,
        position: new THREE.Vector3(cluster.x, 0, cluster.z),
      });
    }
    this.labelMgr.setSectorLabels(sectors, this.scene);
  }

  private resize(): void {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelMgr.resize(w, h);
  }

  // -----------------------------------------------------------------------
  // Render loop
  // -----------------------------------------------------------------------

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    // Skip rendering when the tab is hidden
    if (document.hidden) return;

    const delta = this.clock.getDelta();

    // Advance camera controller (orbit + fly-to)
    this.cameraCtrl.update(delta);

    // Advance tweens and push result into the instanced mesh
    if (this.tweenMgr.hasActiveAnimations() || this.tweenMgr.target.size > 0) {
      const entries = this.tweenMgr.tick();
      this.cubeField.update(entries);
    }

    // Update LOD labels
    const symbolPositions = new Map<string, THREE.Vector3>();
    for (const sym of this.cubeField.indexToSymbol) {
      const pos = this.cubeField.getPositionOf(sym);
      if (pos) symbolPositions.set(sym, pos);
    }
    this.labelMgr.updateVisibility(this.camera, symbolPositions, this.scene);

    // Draw
    this.renderer.render(this.scene, this.camera);
    this.labelMgr.render(this.scene, this.camera);
  };
}
