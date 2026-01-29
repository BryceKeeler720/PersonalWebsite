import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { PresetConfig } from './PresetManager';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Duration of a fly-to animation in seconds. */
const FLY_DURATION = 1.2;

// ---------------------------------------------------------------------------
// CameraController
// ---------------------------------------------------------------------------

/**
 * Wraps `OrbitControls` and adds smooth fly-to camera animations.
 *
 * Call {@link update} every frame from the render loop.
 */
export class CameraController {
  readonly controls: OrbitControls;

  // Fly-to animation state
  private flying = false;
  private flyElapsed = 0;
  private flyDuration = FLY_DURATION;
  private flyStartPos = new THREE.Vector3();
  private flyEndPos = new THREE.Vector3();
  private flyStartTarget = new THREE.Vector3();
  private flyEndTarget = new THREE.Vector3();

  /** Callback invoked when a fly-to animation starts / ends. */
  onFlyStateChange?: (flying: boolean) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.controls = new OrbitControls(camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Smoothly animate the camera to `position`, optionally looking at `target`.
   * Orbit controls are disabled for the duration of the animation.
   */
  flyTo(position: THREE.Vector3, target?: THREE.Vector3): void {
    const camera = this.controls.object as THREE.PerspectiveCamera;

    this.flyStartPos.copy(camera.position);
    this.flyEndPos.copy(position);
    this.flyStartTarget.copy(this.controls.target);
    this.flyEndTarget.copy(target ?? this.controls.target);

    this.flyElapsed = 0;
    this.flyDuration = FLY_DURATION;
    this.flying = true;
    this.controls.enabled = false;
    this.onFlyStateChange?.(true);
  }

  /** Fly to a preset camera configuration. */
  applyPreset(preset: PresetConfig): void {
    this.flyTo(preset.cameraPosition, preset.cameraTarget);
  }

  /**
   * Must be called once per frame.
   * Advances the fly-to animation (if active) and updates orbit controls.
   */
  update(deltaSeconds: number): void {
    if (this.flying) {
      this.flyElapsed += deltaSeconds;
      const t = Math.min(this.flyElapsed / this.flyDuration, 1);
      const eased = this.easeInOutCubic(t);

      const camera = this.controls.object as THREE.PerspectiveCamera;
      camera.position.lerpVectors(this.flyStartPos, this.flyEndPos, eased);
      this.controls.target.lerpVectors(this.flyStartTarget, this.flyEndTarget, eased);

      if (t >= 1) {
        this.flying = false;
        this.controls.enabled = true;
        this.onFlyStateChange?.(false);
      }
    }

    this.controls.update();
  }

  /** Clean up controls. */
  dispose(): void {
    this.controls.dispose();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  private easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
