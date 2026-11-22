import { EASINGS } from './easing';
import { clamp, frac } from './math';
import { hash01 } from './rng';
import type { LoopStyle, State, WaveMode } from './state';

/**
 * Loop shape: maps a looping phase p∈[0,1) to a 0→1 progress value (before easing).
 *  - pingpong: 0→1→0, perfectly seamless
 *  - load:     0→1 over 85% of the loop, hold at full, then snap back (a "reload")
 */
export function cycle(p: number, style: LoopStyle): number {
  return style === 'pingpong' ? 1 - Math.abs(2 * p - 1) : Math.min(1, p / 0.85);
}

/** Position of a cell along the wave, normalised to [0,1]. */
export function waveOffset(mode: WaveMode, i: number, j: number, cols: number, rows: number, seed: number): number {
  const nx = cols > 1 ? i / (cols - 1) : 0.5;
  const ny = rows > 1 ? j / (rows - 1) : 0.5;
  switch (mode) {
    case 'row':
      return rows > 1 ? ny : nx;
    case 'col':
      return cols > 1 ? nx : ny;
    case 'radial':
      return clamp(Math.hypot(nx - 0.5, ny - 0.5) / 0.7071);
    case 'random':
      return hash01(seed, i, j);
    case 'diag':
    default: {
      const dims = (cols > 1 ? 1 : 0) + (rows > 1 ? 1 : 0);
      if (dims === 0) return 0;
      return ((cols > 1 ? nx : 0) + (rows > 1 ? ny : 0)) / dims;
    }
  }
}

/**
 * Eased progress for one cell at global loop time t∈[0,1).
 * `lag` shifts the cell backwards in time (used for echo trails).
 */
export function progress(state: State, t: number, offset: number, lag = 0): number {
  const r = state.rhythm;
  const p = frac(t + r.stagger * offset - lag);
  let e = EASINGS[r.easing](cycle(p, r.loop));
  if (state.weight.invert) e = 1 - e;
  return e;
}

/** Eased progress → CSS-like weight 100…900 */
export function weightAt(state: State, e: number): number {
  const { min, max } = state.weight;
  return min + (max - min) * clamp(e);
}

/** Weight 100…900 → 0…1 */
export const weightUnit = (w: number) => clamp((w - 100) / 800);

/**
 * Solid-shape "weight": the thickness of the inner outline that grows from a hairline (Thin)
 * to a fully filled form (Black). Returned in frame units (1080-based).
 */
export function insetFor(u: number, cell: number): number {
  const hair = Math.max(1.2, cell * 0.012);
  const full = cell * 0.5;
  const k = clamp(u / 0.92); // reaches fully solid slightly before the weight maximum — no pinholes
  return k >= 1 ? cell : hair + (full - hair) * Math.pow(k, 1.6);
}
