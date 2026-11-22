import type { ShapeAsset } from '../core/assets';
import { luminance } from '../core/color';
import { EASINGS } from '../core/easing';
import { compose, frac, rotate, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import { hash01 } from '../core/rng';
import type { ScrollDir, TileRule } from '../core/state';
import { progress, waveOffset } from '../core/timeline';
import type { RenderContext } from './types';

/** How many tiles until the orientation rule repeats — scrolling by one period is a seamless loop. */
const PERIOD: Record<TileRule, number> = { same: 1, mirror: 2, checker: 2, pinwheel: 2, spin: 4, random: 4 };

const DIRS: Record<ScrollDir, [number, number]> = {
  l: [-1, 0],
  r: [1, 0],
  u: [0, -1],
  d: [0, 1],
  ul: [-1, -1],
  ur: [1, -1],
  dl: [-1, 1],
  dr: [1, 1],
};

/** Artwork is drawn a hair larger than its cell (clipped to it) so artboard edges never leave a seam. */
const OVERSCAN = 1.006;

const mod = (n: number, m: number) => ((n % m) + m) % m;

interface Orientation {
  quarter: number; // 0…3 quarter turns
  fx: boolean;
  fy: boolean;
}

/** Orientation of the tile at lattice position (ci, cj). Depends only on position mod period → seamless tiling. */
function orientation(rule: TileRule, ci: number, cj: number, seed: number): Orientation {
  const a = mod(ci, 2);
  const b = mod(cj, 2);
  switch (rule) {
    case 'mirror':
      return { quarter: 0, fx: a === 1, fy: b === 1 };
    case 'checker':
      return { quarter: 0, fx: (a + b) % 2 === 1, fy: false };
    case 'pinwheel':
      return { quarter: [[0, 1], [3, 2]][b][a], fx: false, fy: false };
    case 'spin':
      return { quarter: mod(ci + cj, 4), fx: false, fy: false };
    case 'random': {
      const h = hash01(seed, mod(ci, 4), mod(cj, 4));
      return { quarter: Math.floor(h * 4) % 4, fx: hash01(seed + 1, mod(ci, 4), mod(cj, 4)) > 0.5, fy: false };
    }
    case 'same':
    default:
      return { quarter: 0, fx: false, fy: false };
  }
}

/**
 * Seamless tile layout: the asset is one complete 1080 tile that fills its cell edge to edge. Cells are
 * rotated / mirrored by a rule so the artwork joins up; the whole field can scroll in a perfect loop.
 */
export function renderTileLoop({ painter, state, t, assets }: RenderContext) {
  const s = state.shape;
  const asset: ShapeAsset = assets[0];
  const n = s.tiles;
  const cell = FRAME / n;
  const P = PERIOD[s.rule];
  const ease = EASINGS[state.rhythm.easing];

  // two-tone recolouring: light parts of the artwork take the foreground, dark parts the background
  const light = state.color.fg[0];
  const dark = state.color.bg;
  const fill = state.assets.keepColors
    ? null
    : (orig: string | null) => ((orig ? luminance(orig) > 0.5 : true) !== s.invert ? light : dark);

  // scroll offset in tiles
  let pos = 0;
  if (s.tileMotion === 'scroll') pos = ease(frac(t)) * P;
  else if (s.tileMotion === 'swing') pos = ease(1 - Math.abs(2 * frac(t) - 1)) * Math.max(1, P / 2);
  const [dx, dy] = DIRS[s.dir];
  const ox = dx * pos * cell;
  const oy = dy * pos * cell;

  painter.pushClip(0, 0, FRAME, FRAME);
  const bleed = 0.6; // tiles overlap by a hair so no seam shows between them
  for (let cj = -P - 1; cj <= n + P; cj++) {
    for (let ci = -P - 1; ci <= n + P; ci++) {
      const x = ci * cell + ox;
      const y = cj * cell + oy;
      if (x >= FRAME || x + cell <= 0 || y >= FRAME || y + cell <= 0) continue;

      const o = orientation(s.rule, ci, cj, state.color.seed);
      let spin = 0;
      let flip = 1;
      if (s.tileMotion === 'flip' || s.tileMotion === 'rotate') {
        const off = waveOffset(state.rhythm.wave, mod(ci, n), mod(cj, n), n, n, state.color.seed);
        const e = progress(state, t, off);
        if (s.tileMotion === 'flip') flip = Math.cos(Math.min(1.1, Math.max(-0.1, e)) * Math.PI);
        else spin = e * (Math.PI / 2) * ((ci + cj) % 2 ? -1 : 1);
      }

      const m = compose(
        translate(x + cell / 2, y + cell / 2),
        rotate(spin),
        scale(flip, 1),
        rotate((o.quarter * Math.PI) / 2),
        scale(o.fx ? -1 : 1, o.fy ? -1 : 1),
        scale((cell / asset.vb.w) * OVERSCAN, (cell / asset.vb.h) * OVERSCAN),
        translate(-(asset.vb.x + asset.vb.w / 2), -(asset.vb.y + asset.vb.h / 2)),
      );
      painter.pushClip(x - bleed, y - bleed, cell + bleed * 2, cell + bleed * 2);
      painter.shape(asset, m, { fill, inset: 9999 });
      painter.popClip();
    }
  }
  painter.popClip();
}
