import { hash01 } from './rng';
import type { GenType } from './state';

const TAU = Math.PI * 2;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** Smooth value noise on an integer lattice. */
function valueNoise(seed: number, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  const a = hash01(seed, xi, yi);
  const b = hash01(seed, xi + 1, yi);
  const c = hash01(seed, xi, yi + 1);
  const d = hash01(seed, xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/**
 * Generator field: a value in 0‥1 for a point (u, v) of the frame (both 0‥1) at loop time t.
 * `cycles` (whole number) is how many times the field travels per loop — every generator is periodic in
 * time, so the loop is seamless. `scale` is how many repeats fit across the frame.
 */
export function fieldValue(type: GenType, u: number, v: number, t: number, scale: number, cycles: number, seed: number): number {
  const ph = t * cycles; // whole cycles per loop
  switch (type) {
    case 'rings': {
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      return 0.5 + 0.5 * Math.sin(TAU * (d * scale - ph));
    }
    case 'waves':
      return 0.5 + 0.5 * Math.sin(TAU * ((u * scale) + 0.5 * Math.sin(TAU * v * 1.5) - ph));
    case 'barsX':
      return 0.5 + 0.5 * Math.sin(TAU * (u * scale - ph));
    case 'barsY':
      return 0.5 + 0.5 * Math.sin(TAU * (v * scale - ph));
    case 'radial': {
      const a = Math.atan2(v - 0.5, u - 0.5) / TAU;
      return 0.5 + 0.5 * Math.sin(TAU * (a * Math.max(1, Math.round(scale)) - ph));
    }
    case 'gradient':
      // a soft ramp that sweeps across and wraps (triangle wave keeps it continuous)
      return Math.abs(((((u + v) / 2) * scale - ph) % 1 + 1) % 1 * 2 - 1);
    case 'checker': {
      const k = Math.floor(u * scale * 2) + Math.floor(v * scale * 2);
      const on = (k % 2 + 2) % 2;
      const blend = 0.5 + 0.5 * Math.cos(TAU * ph);
      return on ? blend : 1 - blend;
    }
    case 'noise': {
      // walk around a circle in noise space → returns to the same value after one loop
      const r = 1.2;
      const a = TAU * t * (cycles === 0 ? 0 : Math.sign(cycles));
      return valueNoise(seed, u * scale * 2 + r * Math.cos(a), v * scale * 2 + r * Math.sin(a) + 31.7);
    }
    case 'off':
    default:
      return 0.5;
  }
}

/** Quantise a 0‥1 value to `levels` steps (0 or 1 = smooth). */
export const quantise = (x: number, levels: number) => (levels >= 2 ? Math.round(x * (levels - 1)) / (levels - 1) : x);
