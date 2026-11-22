import type { ShapeAsset } from '../core/assets';
import { hash01 } from '../core/rng';
import type { Painter } from '../core/painter';
import type { State } from '../core/state';

export interface RenderContext {
  painter: Painter;
  state: State;
  /** looping time, 0 ≤ t < 1 */
  t: number;
  /** assets currently selected by the user (never empty) */
  assets: ShapeAsset[];
}

/** Pick the foreground colour for a cell according to the colour mode. */
export function pickColor(state: State, i: number, j: number): string {
  const { fg, mode, seed } = state.color;
  const n = fg.length;
  switch (mode) {
    case 'row':
      return fg[((j % n) + n) % n];
    case 'col':
      return fg[((i % n) + n) % n];
    case 'random':
      return fg[Math.floor(hash01(seed, i * 31 + 7, j * 17 + 3) * n) % n];
    case 'cycle':
    default:
      return fg[(((i + j) % n) + n) % n];
  }
}

/** Pick which asset a cell shows. */
export function pickAsset(state: State, assets: ShapeAsset[], i: number, j: number): ShapeAsset {
  const n = assets.length;
  if (n === 1) return assets[0];
  if (state.shape.arrange === 'random') return assets[Math.floor(hash01(state.color.seed, i + 101, j + 53) * n) % n];
  return assets[(i + j) % n];
}
