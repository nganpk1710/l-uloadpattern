import { capHeight, measure } from '../core/fonts';
import { clamp, compose, lerp, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import { insetFor, progress, waveOffset, weightAt, weightUnit } from '../core/timeline';
import { pickAsset, pickColor, type RenderContext } from './types';

/**
 * 03 · Wide-to-Narrow — each row is divided into columns whose widths breathe between narrow and wide
 * while the row always fills the frame. Glyphs (or shapes) are stretched to their cell, so they flip
 * between tall slivers and low, heavy slabs.
 */
export function renderWideNarrow({ painter, state, t, assets }: RenderContext) {
  const s = state.wide;
  const m = FRAME * s.margin;
  const area = FRAME - m * 2;
  const rowH = area / s.rows;
  const gapPx = s.gap * rowH;
  const chars = Array.from((s.chars || 'LƯU').toUpperCase().normalize('NFC')).filter((c) => c.trim());
  // the tallest glyph in the set (Ư has a horn above cap height) defines the fitting height
  const tallest = Math.max(capHeight(), ...chars.map((c) => measure(c, 900).asc));

  for (let j = 0; j < s.rows; j++) {
    // 1 — how wide is every column right now?
    const es: number[] = [];
    const raw: number[] = [];
    for (let i = 0; i < s.cols; i++) {
      const off = waveOffset(state.rhythm.wave, i, j, s.cols, s.rows, state.color.seed);
      const e = progress(state, t, off);
      es.push(e);
      raw.push(lerp(1, Math.max(1, s.ratio), clamp(e)));
    }
    const total = raw.reduce((a, b) => a + b, 0);

    // 2 — lay them out edge to edge
    let x = m;
    for (let i = 0; i < s.cols; i++) {
      const w = (raw[i] / total) * area;
      const e = es[i];
      const y = m + j * rowH;
      const bx = x + gapPx / 2;
      const by = y + gapPx / 2;
      const bw = Math.max(1, w - gapPx);
      const bh = Math.max(1, rowH - gapPx);
      x += w;

      const fg = pickColor(state, i, j);
      if (s.block) painter.rect(bx, by, bw, bh, fg);
      const ink = s.block ? state.color.bg : fg;

      const wght = s.linkWeight ? weightAt(state, e) : state.weight.max;
      const padX = Math.min(bw * 0.14, 16);
      const padY = bh * 0.07;
      const ix = bx + padX;
      const iy = by + padY;
      const iw = Math.max(1, bw - padX * 2);
      const ih = Math.max(1, bh - padY * 2);

      if (s.mode === 'text' && chars.length) {
        const ch = chars[(i + j * 3) % chars.length];
        const met = measure(ch, wght);
        const inkW = Math.max(1, met.inkL + met.inkR);
        const sx = iw / inkW;
        const sy = ih / tallest;
        painter.text(ch, compose(translate(ix + met.inkL * sx, iy + ih), scale(sx, sy)), { weight: wght, fill: ink });
      } else if (s.mode === 'shape') {
        const asset = pickAsset(state, assets, i, j);
        const u = weightUnit(wght);
        const matrix = compose(
          translate(ix, iy),
          scale(iw / asset.vb.w, ih / asset.vb.h),
          translate(-asset.vb.x, -asset.vb.y),
        );
        painter.shape(asset, matrix, {
          fill: state.assets.keepColors ? null : ink,
          inset: insetFor(u, Math.min(iw, ih)),
        });
      }
    }
  }
}
