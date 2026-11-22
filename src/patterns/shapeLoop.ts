import { compose, lerp, rotate, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import { insetFor, progress, waveOffset, weightAt, weightUnit } from '../core/timeline';
import { renderTileLoop } from './tileLoop';
import { pickAsset, pickColor, type RenderContext } from './types';

/**
 * 01 · Shape Loop — a grid of solid geometric shapes. Each cell breathes from a hairline
 * outline (Thin) to a fully filled form (Black), rippling across the grid.
 */
export function renderShapeLoop(rc: RenderContext) {
  if (rc.state.shape.layout === 'tile') return renderTileLoop(rc);
  const { painter, state, t, assets } = rc;
  const s = state.shape;
  const m = FRAME * s.margin;
  const area = FRAME - m * 2;
  const cw = area / s.cols;
  const ch = area / s.rows;
  const cell = Math.min(cw, ch);

  for (let j = 0; j < s.rows; j++) {
    for (let i = 0; i < s.cols; i++) {
      const asset = pickAsset(state, assets, i, j);
      const off = waveOffset(state.rhythm.wave, i, j, s.cols, s.rows, state.color.seed);
      const e = progress(state, t, off);
      const u = weightUnit(weightAt(state, e));

      const boxW = cw * (1 - s.gap);
      const boxH = ch * (1 - s.gap);
      const fit = Math.min(boxW / asset.vb.w, boxH / asset.vb.h);

      let rot = 0;
      let flip = 1;
      let grow = 1;
      const ec = Math.min(1.15, Math.max(-0.15, e)); // let easing overshoot show a little
      if (s.motion === 'rotate') rot = ec * (Math.PI / 2) * ((i + j) % 2 ? -1 : 1);
      if (s.motion === 'flip') flip = Math.cos(ec * Math.PI);
      if (s.motion === 'scale') grow = lerp(0.55, 1, Math.min(1, Math.max(0, e)));

      const cx = m + cw * (i + 0.5);
      const cy = m + ch * (j + 0.5);
      const matrix = compose(
        translate(cx, cy),
        rotate(rot),
        scale(flip * grow, grow),
        scale(fit),
        translate(-(asset.vb.x + asset.vb.w / 2), -(asset.vb.y + asset.vb.h / 2)),
      );

      painter.shape(asset, matrix, {
        fill: state.assets.keepColors ? null : pickColor(state, i, j),
        inset: insetFor(u, cell * (1 - s.gap)),
      });
    }
  }
}
