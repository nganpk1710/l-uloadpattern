import type { ShapeAsset } from '../core/assets';
import { luminance } from '../core/color';
import { EASINGS } from '../core/easing';
import { compose, frac, rotate, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import { hash01 } from '../core/rng';
import type { ScrollDir, TileRule } from '../core/state';
import { progress, waveOffset } from '../core/timeline';
import { pickAsset, pickColor, type RenderContext } from './types';

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

const mod = (n: number, m: number) => ((n % m) + m) % m;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);

/** Artwork of a full-bleed tile is drawn a hair larger than its cell so artboard edges never leave a seam. */
const OVERSCAN = 1.006;

interface Orientation {
  quarter: number; // 0…3 quarter turns
  fx: boolean;
  fy: boolean;
}

/** Cells until the orientation rule repeats. Random rules repeat every `n` cells (the lattice size). */
function period(rule: TileRule, n: number): number {
  switch (rule) {
    case 'same':
      return 1;
    case 'spin':
      return 4;
    case 'random':
    case 'turns':
      return n;
    default:
      return 2;
  }
}

/** Orientation of the cell at lattice position (ci, cj). Depends only on position mod period → seamless loops. */
function orientation(rule: TileRule, ci: number, cj: number, n: number, seed: number): Orientation {
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
    case 'random':
    case 'turns': {
      const i = mod(ci, n);
      const j = mod(cj, n);
      return {
        quarter: Math.floor(hash01(seed, i, j) * 4) % 4,
        fx: rule === 'random' && hash01(seed + 1, i, j) > 0.5,
        fy: false,
      };
    }
    case 'same':
    default:
      return { quarter: 0, fx: false, fy: false };
  }
}

/**
 * Seamless tile layout. The asset is a single motif; every cell shows it rotated / mirrored by a rule
 * (or at random). The whole field — or each row / column on its own — travels across the frame and wraps,
 * so the loop is perfect: it always travels a whole number of lattice periods.
 */
export function renderTileLoop({ painter, state, t, assets }: RenderContext) {
  const s = state.shape;
  const n = s.tiles;
  const cell = FRAME / n;
  const ease = EASINGS[state.rhythm.easing];
  const first = assets[0];

  // ---- colour: motifs take the foreground colour, full tiles keep their two tones ----
  const light = state.color.fg[0];
  const dark = state.color.bg;
  if (!first.twoTone && s.invert && !state.assets.keepColors) painter.rect(0, 0, FRAME, FRAME, light);

  // ---- loop length: a whole number of periods in cells ----
  let L = period(s.rule, n);
  if (assets.length > 1) L = lcm(L, n);
  if (s.brick > 0) L = lcm(L, 2);
  L = Math.min(L, 48) * Math.max(1, Math.round(s.laps));
  const pos = s.tileMotion === 'scroll' || s.tileMotion === 'rows' || s.tileMotion === 'cols' ? ease(frac(t)) * L : 0;
  const [dx, dy] = DIRS[s.dir];

  const slots: number[] = [];
  for (let k = -1; k <= n + 1; k++) slots.push(k);

  const k = Math.floor(pos);
  const f = pos - k;

  painter.pushClip(0, 0, FRAME, FRAME);
  for (const sj of slots) {
    for (const si of slots) {
      // travel per mode
      let sx = 0;
      let sy = 0;
      if (s.tileMotion === 'scroll') {
        sx = dx;
        sy = dy;
      } else if (s.tileMotion === 'rows') {
        sx = (mod(sj, 2) ? -1 : 1) * (dx || 1);
      } else if (s.tileMotion === 'cols') {
        sy = (mod(si, 2) ? -1 : 1) * (dy || 1);
      }
      // virtual lattice index of the shape sitting in this slot (it keeps its orientation while it travels)
      const vi = si - sx * k;
      const vj = sj - sy * k;
      const px = (si + sx * f) * cell;
      const py = (sj + sy * f) * cell;
      const brick = mod(vj, 2) ? s.brick * cell : 0;
      const x = px + brick;
      const y = py;
      if (x >= FRAME || x + cell <= 0 || y >= FRAME || y + cell <= 0) continue;

      const o = orientation(s.rule, vi, vj, n, state.color.seed);
      let spin = 0;
      let flip = 1;
      if (s.tileMotion === 'flip' || s.tileMotion === 'rotate') {
        const off = waveOffset(state.rhythm.wave, mod(vi, n), mod(vj, n), n, n, state.color.seed);
        const e = progress(state, t, off);
        if (s.tileMotion === 'flip') flip = Math.cos(Math.min(1.1, Math.max(-0.1, e)) * Math.PI);
        else spin = e * (Math.PI / 2) * ((vi + vj) % 2 ? -1 : 1);
      }

      const asset: ShapeAsset = pickAsset(state, assets, mod(vi, n), mod(vj, n));
      const b = asset.bbox;
      // full tiles fill their cell exactly; motifs fit their longest side to the cell, grown by the (negative) gap
      const fullTile = asset.twoTone;
      const sc = fullTile
        ? (cell / Math.max(b.w, b.h)) * OVERSCAN
        : (cell * (1 - s.tileGap)) / Math.max(b.w, b.h);
      const m = compose(
        translate(x + cell / 2, y + cell / 2),
        rotate(spin),
        scale(flip, 1),
        rotate((o.quarter * Math.PI) / 2),
        scale(o.fx ? -1 : 1, o.fy ? -1 : 1),
        scale(fullTile ? (cell / b.w) * OVERSCAN : sc, fullTile ? (cell / b.h) * OVERSCAN : sc),
        translate(-(b.x + b.w / 2), -(b.y + b.h / 2)),
      );

      let fill: string | null | ((o: string | null) => string);
      if (state.assets.keepColors) fill = null;
      else if (fullTile) fill = (orig) => ((orig ? luminance(orig) > 0.5 : true) !== s.invert ? light : dark);
      else fill = s.invert ? dark : s.multi ? pickColor(state, mod(vi, n), mod(vj, n)) : light;

      if (fullTile) painter.pushClip(x - 0.6, y - 0.6, cell + 1.2, cell + 1.2);
      painter.shape(asset, m, { fill, inset: 9999 });
      if (fullTile) painter.popClip();
    }
  }
  painter.popClip();
}
