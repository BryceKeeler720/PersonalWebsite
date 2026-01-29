import * as THREE from 'three';
import type { FilterState } from './dataTransforms';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PresetName = 'default' | 'bot-view' | 'sector-view' | 'heat-map';

export interface PresetConfig {
  cameraPosition: THREE.Vector3;
  cameraTarget: THREE.Vector3;
  filterOverride?: Partial<FilterState>;
  layoutMode?: 'cluster' | 'flat-grid';
  labelMode: 'lod' | 'sector-only' | 'active-only';
}

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

export const PRESETS: Record<PresetName, PresetConfig> = {
  default: {
    cameraPosition: new THREE.Vector3(0, 40, 80),
    cameraTarget: new THREE.Vector3(0, 0, 0),
    layoutMode: 'cluster',
    labelMode: 'lod',
  },

  'bot-view': {
    cameraPosition: new THREE.Vector3(0, 25, 50),
    cameraTarget: new THREE.Vector3(0, 0, 0),
    filterOverride: {
      signalTypes: ['STRONG_BUY', 'BUY', 'SELL', 'STRONG_SELL'],
    },
    labelMode: 'active-only',
  },

  'sector-view': {
    cameraPosition: new THREE.Vector3(0, 60, 40),
    cameraTarget: new THREE.Vector3(0, 0, 0),
    layoutMode: 'cluster',
    labelMode: 'sector-only',
  },

  'heat-map': {
    cameraPosition: new THREE.Vector3(0, 100, 1),
    cameraTarget: new THREE.Vector3(0, 0, 0),
    layoutMode: 'flat-grid',
    labelMode: 'lod',
  },
};

// ---------------------------------------------------------------------------
// Accessor
// ---------------------------------------------------------------------------

export function getPreset(name: PresetName): PresetConfig {
  return PRESETS[name];
}
