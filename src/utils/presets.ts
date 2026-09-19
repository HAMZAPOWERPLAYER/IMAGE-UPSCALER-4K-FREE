/**
 * Preset Management with localStorage persistence & private-browsing safety
 */

import { Preset, ProcessingSettings } from '../types';

export const PRESETS_STORAGE_KEY = 'upscale.presets.v1';

export const DEFAULT_SETTINGS: ProcessingSettings = {
  scalingMode: 'multiplier',
  scaleMultiplier: 2,
  targetWidth: 3840,
  targetHeight: 2160,
  lockAspectRatio: true,
  resamplingMode: 'lanczos',
  sharpenEnabled: true,
  sharpenStrength: 25,
  denoiseStrength: 15,
  clarityBoost: true,
  exportFormat: 'image/webp',
  exportQuality: 0.92,
};

export const BUILTIN_PRESETS: Preset[] = [
  {
    id: 'builtin-2x-crisp',
    name: '2× Multiplier (Crisp & Balanced)',
    isBuiltIn: true,
    settings: {
      scalingMode: 'multiplier',
      scaleMultiplier: 2,
      targetWidth: 3840,
      targetHeight: 2160,
      lockAspectRatio: true,
      resamplingMode: 'lanczos',
      sharpenEnabled: true,
      sharpenStrength: 25,
      denoiseStrength: 15,
      clarityBoost: true,
      exportFormat: 'image/webp',
      exportQuality: 0.92,
    },
  },
  {
    id: 'builtin-4x-ultra',
    name: '4× Ultra HD Multiplier',
    isBuiltIn: true,
    settings: {
      scalingMode: 'multiplier',
      scaleMultiplier: 4,
      targetWidth: 3840,
      targetHeight: 2160,
      lockAspectRatio: true,
      resamplingMode: 'lanczos',
      sharpenEnabled: true,
      sharpenStrength: 35,
      denoiseStrength: 25,
      clarityBoost: true,
      exportFormat: 'image/png',
      exportQuality: 1.0,
    },
  },
  {
    id: 'builtin-4k-wallpaper',
    name: '4K Wallpaper (3840×2160)',
    isBuiltIn: true,
    settings: {
      scalingMode: 'dimensions',
      scaleMultiplier: 2,
      targetWidth: 3840,
      targetHeight: 2160,
      lockAspectRatio: true,
      resamplingMode: 'lanczos',
      sharpenEnabled: true,
      sharpenStrength: 25,
      denoiseStrength: 10,
      clarityBoost: true,
      exportFormat: 'image/webp',
      exportQuality: 0.92,
    },
  },
  {
    id: 'builtin-social-hd',
    name: 'Social Thumbnail (1200×630)',
    isBuiltIn: true,
    settings: {
      scalingMode: 'dimensions',
      scaleMultiplier: 2,
      targetWidth: 1200,
      targetHeight: 630,
      lockAspectRatio: false,
      resamplingMode: 'lanczos',
      sharpenEnabled: true,
      sharpenStrength: 20,
      denoiseStrength: 10,
      clarityBoost: true,
      exportFormat: 'image/jpeg',
      exportQuality: 0.85,
    },
  },
  {
    id: 'builtin-print-1080p',
    name: 'Print-ready 1080p Lossless',
    isBuiltIn: true,
    settings: {
      scalingMode: 'dimensions',
      scaleMultiplier: 2,
      targetWidth: 1920,
      targetHeight: 1080,
      lockAspectRatio: true,
      resamplingMode: 'lanczos',
      sharpenEnabled: true,
      sharpenStrength: 15,
      denoiseStrength: 5,
      clarityBoost: false,
      exportFormat: 'image/png',
      exportQuality: 1.0,
    },
  },
];

/**
 * Checks if localStorage is available and writable
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Loads presets from localStorage merged with built-in presets
 */
export function loadPresets(): { presets: Preset[]; isStorageWritable: boolean } {
  const writable = isLocalStorageAvailable();
  if (!writable) {
    return { presets: [...BUILTIN_PRESETS], isStorageWritable: false };
  }

  try {
    const raw = window.localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) {
      return { presets: [...BUILTIN_PRESETS], isStorageWritable: true };
    }
    const savedUserPresets: Preset[] = JSON.parse(raw);
    return {
      presets: [...BUILTIN_PRESETS, ...savedUserPresets.filter(p => !p.isBuiltIn)],
      isStorageWritable: true,
    };
  } catch {
    return { presets: [...BUILTIN_PRESETS], isStorageWritable: true };
  }
}

/**
 * Saves user-created presets to localStorage
 */
export function saveUserPresets(presets: Preset[]): boolean {
  if (!isLocalStorageAvailable()) return false;
  try {
    const userOnly = presets.filter(p => !p.isBuiltIn);
    window.localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(userOnly));
    return true;
  } catch {
    return false;
  }
}
