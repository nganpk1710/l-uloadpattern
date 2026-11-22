import type { ShapeAsset } from '../core/assets';
import { luminance } from '../core/color';
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

/** Cells until the orientation rule repeats. Random rules repeat every `n` cells. */
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
 * Loop — a repeated background. The asset is a single motif placed on a lattice (Grid, Brick by Row /
 * Column, Hex by Row / Column) and rotated / mirrored per cell by a rule or at random. The whole field —
 * or each row / column on its own — travels forever in one direction. It always moves a whole number of
 * lattice periods, so the last frame meets the first.
 */
export function renderTileLoop({ painter, state, t, assets }: RenderContext) {
  const s = state.shape;
  const first = assets[0];

  // ---- lattice geometry ----
  const w = s.tileW;
  const h = s.tileLock ? s.tileW : s.tileH;
  const colStep = s.tileType === 'hexCol' ? w * 0.75 : w;
  const rowStep = s.tileType === 'hexRow' ? h * 0.75 : h;
  const rowShift = s.tileType === 'brickRow' ? s.brickOffset * w : s.tileType === 'hexRow' ? w / 2 : 0;
  const colShift = s.tileType === 'brickCol' ? s.brickOffset * h : s.tileType === 'hexCol' ? h / 2 : 0;

  // ---- colour: motifs take the foreground colour, full tiles keep their two tones ----
  const light = state.color.fg[0];
  const dark = state.color.bg;
  if (!first.twoTone && s.invert && !state.assets.keepColors) painter.rect(0, 0, FRAME, FRAME, light);

  // ---- loop length: a whole number of lattice periods ----
  const fgN = state.color.fg.length;
  let R = Math.min(12, Math.max(4, Math.ceil(FRAME / Math.min(colStep, rowStep)) + 1));
  if (s.multi) R = Math.ceil(R / fgN) * fgN;
  let L = period(s.rule, R);
  if (assets.length > 1) L = lcm(L, R);
  if (rowShift || colShift) L = lcm(L, 2);
  L = Math.min(L, 48) * Math.max(1, Math.round(s.laps));

  const travelling = s.tileMotion === 'scroll' || s.tileMotion === 'rows' || s.tileMotion === 'cols';
  const pos = travelling ? frac(t) * L : 0; // constant speed — it never turns back
  const k = Math.floor(pos);
  const f = pos - k;
  const [dx, dy] = DIRS[s.dir];

  const nx = Math.ceil(FRAME / colStep) + 2;
  const ny = Math.ceil(FRAME / rowStep) + 2;

  painter.pushClip(0, 0, FRAME, FRAME);
  for (let sj = -2; sj <= ny; sj++) {
    for (let si = -2; si <= nx; si++) {
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
      // the shape sitting in this slot keeps its identity (orientation, colour) while it travels
      const vi = si - sx * k;
      const vj = sj - sy * k;
      const x = si * colStep + sx * f * colStep + (mod(vj, 2) ? rowShift : 0);
      const y = sj * rowStep + sy * f * rowStep + (mod(vi, 2) ? colShift : 0);
      if (x >= FRAME || x + w <= 0 || y >= FRAME || y + h <= 0) continue;

      const o = orientation(s.rule, vi, vj, R, state.color.seed);
      let spin = 0;
      let flip = 1;
      if (s.tileMotion === 'flip' || s.tileMotion === 'rotate') {
        const off = waveOffset(state.rhythm.wave, mod(vi, R), mod(vj, R), R, R, state.color.seed);
        const e = progress(state, t, off);
        if (s.tileMotion === 'flip') flip = Math.cos(Math.min(1.1, Math.max(-0.1, e)) * Math.PI);
        else spin = e * (Math.PI / 2) * ((vi + vj) % 2 ? -1 : 1);
      }

      const asset: ShapeAsset = pickAsset(state, assets, mod(vi, R), mod(vj, R));
      const b = asset.bbox;
      const fullTile = asset.twoTone;
      const sc = (Math.min(w, h) * (1 - s.tileGap)) / Math.max(b.w, b.h);
      const m = compose(
        translate(x + w / 2, y + h / 2),
        rotate(spin),
        scale(flip, 1),
        rotate((o.quarter * Math.PI) / 2),
        scale(o.fx ? -1 : 1, o.fy ? -1 : 1),
        fullTile ? scale((w / b.w) * OVERSCAN, (h / b.h) * OVERSCAN) : scale(sc),
        translate(-(b.x + b.w / 2), -(b.y + b.h / 2)),
      );

      let fill: string | null | ((o: string | null) => string);
      if (state.assets.keepColors) fill = null;
      else if (fullTile) fill = (orig) => ((orig ? luminance(orig) > 0.5 : true) !== s.invert ? light : dark);
      else fill = s.invert ? dark : s.multi ? pickColor(state, mod(vi, R), mod(vj, R)) : light;

      if (fullTile) painter.pushClip(x - 0.6, y - 0.6, w + 1.2, h + 1.2);
      painter.shape(asset, m, { fill, inset: 9999 });
      if (fullTile) painter.popClip();
    }
  }
  painter.popClip();
}
