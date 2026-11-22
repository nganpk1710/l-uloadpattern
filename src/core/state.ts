import type { EasingId } from './easing';

export type PatternId = 'shape' | 'text';
export type LoopStyle = 'pingpong' | 'load';
export type WaveMode = 'diag' | 'row' | 'col' | 'radial' | 'random';
export type ColorMode = 'cycle' | 'row' | 'col' | 'random';
export type ShapeMotion = 'weight' | 'rotate' | 'flip' | 'scale';
/** tile = Loop (repeated background) · loose = Thin → Black grid */
export type ShapeLayout = 'tile' | 'loose';
export type TileType = 'grid' | 'brickRow' | 'brickCol' | 'hexCol' | 'hexRow';
export type TextMode = 'weight' | 'loop';
export type TextDir = 'l' | 'r' | 'u' | 'd';
export type TileRule = 'same' | 'mirror' | 'checker' | 'pinwheel' | 'spin' | 'turns' | 'random' | 'custom';
export type TileMotion = 'scroll' | 'rows' | 'cols' | 'flip' | 'rotate' | 'still';
export type ScrollDir = 'l' | 'r' | 'u' | 'd' | 'ul' | 'ur' | 'dl' | 'dr';
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
  shape: {
    layout: ShapeLayout;
    tileType: TileType;
    /** tile box size in frame units (1080 = whole frame) */
    tileW: number;
    tileH: number;
    /** keep height equal to width */
    tileLock: boolean;
    /** brick types: how far every other row / column is shifted, as a fraction of the tile */
    brickOffset: number;
    rule: TileRule;
    tileMotion: TileMotion;
    dir: ScrollDir;
    /** swap the light and dark tone of the tile */
    invert: boolean;
    /** full laps of the lattice per loop — always a whole number so the loop stays seamless */
    laps: number;
    /** colour each shape from the whole palette instead of the first colour only */
    multi: boolean;
    cols: number;
    rows: number;
    gap: number;
    /** shape size (its longest side, frame units) — independent of the tile spacing */
    size: number;
    /** custom arrangement: a patW × patH block of orientations that repeats (0‥3 quarter turns, +4 = mirrored) */
    patW: number;
    patH: number;
    cells: number[];
    /** per row (or column) travel: 0 auto · -1 backwards · 1 forwards · 2 still; speed = whole laps multiplier */
    lineDir: number[];
    lineSpeed: number[];
    margin: number;
    motion: ShapeMotion;
    arrange: 'cycle' | 'random';
  };
  text: {
    content: string;
    rows: number;
    gap: number;
    margin: number;
    repeat: number;
    echo: number;
    shift: number;
    /** how far the back layers swing sideways, as a fraction of one tile */
    spread: number;
    slide: 'alternate' | 'same' | 'none';
    /** Thin → Black morph, or a continuous repeated-background loop — never both */
    mode: TextMode;
    /** loop travel direction */
    dir: TextDir;
    /** neighbouring lines (or columns) travel in opposite directions */
    alt: boolean;
    /** full tile-lengths travelled per loop */
    laps: number;
    /** type — fixed weight used by the loop (100 … 900) */
    weight: number;
    /** letter spacing in em */
    tracking: number;
    /** breathing room between repeated words, in cap heights */
    wordGap: number;
    upper: boolean;
    /** per line (row, or column when the loop runs vertically): same encoding as shape.lineDir */
    lineDir: number[];
    lineSpeed: number[];
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
  rhythm: { duration: 4, easing: 'cubic', loop: 'pingpong', stagger: 0.6, wave: 'diag' },
  weight: { min: 100, max: 900, invert: false },
  color: { bg: '#0800b2', fg: ['#fdfdfd', '#fff11c', '#ba2016'], mode: 'cycle', seed: 7 },
  assets: { selected: ['chatbox-02'], keepColors: false },
  shape: {
    layout: 'tile',
    tileType: 'grid',
    tileW: 360,
    tileH: 360,
    tileLock: true,
    brickOffset: 0.5,
    rule: 'random',
    tileMotion: 'scroll',
    dir: 'l',
    invert: false,
    laps: 1,
    multi: false,
    cols: 5,
    rows: 5,
    gap: 0.12,
    size: 380,
    patW: 3,
    patH: 3,
    cells: [0, 1, 6, 5, 2, 7, 3, 4, 0],
    lineDir: Array(12).fill(0),
    lineSpeed: Array(12).fill(1),
    margin: 0.06,
    motion: 'weight',
    arrange: 'cycle',
  },
  text: {
    content: 'LƯU LOAD',
    rows: 9,
    gap: 0.1,
    margin: 0.06,
    repeat: 2,
    echo: 2,
    shift: 1,
    spread: 0.18,
    slide: 'none',
    mode: 'loop',
    dir: 'l',
    alt: true,
    laps: 1,
    weight: 900,
    tracking: 0,
    wordGap: 0.45,
    upper: true,
    lineDir: Array(20).fill(0),
    lineSpeed: Array(20).fill(1),
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
    if (!['shape', 'text'].includes(this.state.pattern)) this.state.pattern = 'shape';
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
