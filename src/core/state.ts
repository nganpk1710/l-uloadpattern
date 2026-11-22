import type { EasingId } from './easing';

export type PatternId = 'shape' | 'text' | 'wide';
export type LoopStyle = 'pingpong' | 'load';
export type WaveMode = 'diag' | 'row' | 'col' | 'radial' | 'random';
export type ColorMode = 'cycle' | 'row' | 'col' | 'random';
export type ShapeMotion = 'weight' | 'rotate' | 'flip' | 'scale';
export type ExportFormat = 'png' | 'svg' | 'gif' | 'mp4' | 'webm';

export interface State {
  pattern: PatternId;
  rhythm: {
    /** seconds for one full loop */
    duration: number;
    easing: EasingId;
    loop: LoopStyle;
    /** -1..1 — how far the wave is spread across cells */
    stagger: number;
    wave: WaveMode;
  };
  weight: {
    /** 100 (Thin) … 900 (Black) */
    min: number;
    max: number;
    invert: boolean;
  };
  color: {
    bg: string;
    fg: string[];
    mode: ColorMode;
    seed: number;
  };
  assets: {
    selected: string[];
    keepColors: boolean;
  };
  shape: { cols: number; rows: number; gap: number; margin: number; motion: ShapeMotion; arrange: 'cycle' | 'random' };
  text: {
    content: string;
    rows: number;
    gap: number;
    margin: number;
    repeat: number;
    echo: number;
    shift: number;
    slide: 'alternate' | 'same' | 'none';
  };
  wide: {
    mode: 'text' | 'shape';
    chars: string;
    cols: number;
    rows: number;
    gap: number;
    margin: number;
    ratio: number;
    block: boolean;
    linkWeight: boolean;
  };
  export: {
    format: ExportFormat;
    pngSize: number;
    svgOutline: boolean;
    gifSize: number;
    gifFps: number;
    videoSize: number;
    videoFps: number;
    loops: number;
  };
}

export const DEFAULT_STATE: State = {
  pattern: 'shape',
  rhythm: { duration: 4, easing: 'cubic', loop: 'pingpong', stagger: 0.8, wave: 'diag' },
  weight: { min: 100, max: 900, invert: false },
  color: { bg: '#fdfdfd', fg: ['#0800b2', '#111111'], mode: 'cycle', seed: 7 },
  assets: { selected: ['frame', 'loa', 'chatbox', 'arrow-bold'], keepColors: false },
  shape: { cols: 5, rows: 5, gap: 0.12, margin: 0.06, motion: 'weight', arrange: 'cycle' },
  text: {
    content: 'LƯU LOAD',
    rows: 9,
    gap: 0.1,
    margin: 0.06,
    repeat: 2,
    echo: 0,
    shift: 1,
    slide: 'alternate',
  },
  wide: {
    mode: 'text',
    chars: 'LƯULOAD',
    cols: 8,
    rows: 2,
    gap: 0.03,
    margin: 0.05,
    ratio: 6,
    block: true,
    linkWeight: true,
  },
  export: {
    format: 'png',
    pngSize: 2160,
    svgOutline: true,
    gifSize: 540,
    gifFps: 25,
    videoSize: 1080,
    videoFps: 30,
    loops: 2,
  },
};

type Listener = () => void;

export const getPath = (obj: any, path: string): any =>
  path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

export const setPath = (obj: any, path: string, value: unknown): void => {
  const keys = path.split('.');
  const last = keys.pop() as string;
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
};

const STORAGE_KEY = 'luuload.pattern.state.v1';

/** Deep merge that only accepts keys present in the defaults (protects against stale saved state). */
function mergeKnown<T>(base: T, saved: any): T {
  if (Array.isArray(base)) return (Array.isArray(saved) ? saved : base) as T;
  if (base && typeof base === 'object') {
    const out: any = {};
    for (const k of Object.keys(base as object)) {
      out[k] = mergeKnown((base as any)[k], saved?.[k]);
    }
    return out;
  }
  return (typeof saved === typeof base ? saved : base) as T;
}

export class Store {
  state: State;
  private listeners = new Set<Listener>();
  private saveTimer = 0;

  constructor() {
    let saved: unknown = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    } catch {
      /* ignore */
    }
    this.state = mergeKnown(structuredClone(DEFAULT_STATE), saved);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  set(path: string, value: unknown): void {
    setPath(this.state, path, value);
    this.emit();
  }

  /** Mutate several things then notify once. */
  patch(fn: (s: State) => void): void {
    fn(this.state);
    this.emit();
  }

  reset(): void {
    const keepExport = this.state.export;
    this.state = structuredClone(DEFAULT_STATE);
    this.state.export = keepExport;
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
    window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch {
        /* storage full or blocked — non-fatal */
      }
    }, 250);
  }
}
