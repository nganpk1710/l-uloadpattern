import { capHeight, measure } from '../core/fonts';
import { clamp, compose, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import { progress, waveOffset, weightAt } from '../core/timeline';
import { renderTextLoop } from './textLoop';
import { pickColor, type RenderContext } from './types';

const ECHO_LAG = 0.035;

/**
 * 02 · Text Transform Offset — stacked, ultra-tall lines of type. Every line slides sideways by whole
 * tiles (so the loop is seamless at any weight), swells from Thin to Black, and leaves coloured echoes behind.
 */
export function renderTextOffset(rc: RenderContext) {
  if (rc.state.text.mode === 'loop') return renderTextLoop(rc);
  const { painter, state, t } = rc;
  const s = state.text;
  const text = s.upper ? (s.content || ' ').toUpperCase() : s.content || ' ';
  const m = FRAME * s.margin;
  const area = FRAME - m * 2;
  const rowH = area / s.rows;
  const glyphH = rowH * (1 - s.gap);
  const cap = capHeight();
  const sy = glyphH / cap;
  const tileW = area / s.repeat;
  const wholeShift = state.rhythm.loop === 'load' ? Math.round(s.shift) : s.shift;

  painter.pushClip(m, m, area, area);

  for (let r = 0; r < s.rows; r++) {
    const off = waveOffset(state.rhythm.wave, 0, r, 1, s.rows, state.color.seed);
    const baseline = m + r * rowH + (rowH - glyphH) / 2 + glyphH;
    const dir = s.slide === 'same' ? 1 : r % 2 ? 1 : -1;
    const base = state.color.mode === 'cycle' ? 0 : Math.max(0, state.color.fg.indexOf(pickColor(state, 0, r)));

    // furthest echo first so the main line sits on top
    for (let k = s.echo; k >= 0; k--) {
      const e = progress(state, t, off, k * ECHO_LAG);
      const w = weightAt(state, e);
      const met = measure(text, w, s.tracking);
      const unit = met.adv + cap * s.wordGap; // text + breathing gap = one tile
      const sx = tileW / unit;

      const colors = state.color.fg;
      // layer k takes the next colour in the palette, so the back layers (e.g. red, yellow) sit behind the front one
      const fill = colors[(base + k) % colors.length];
      const alpha = k === 0 || colors.length > 1 ? 1 : 0.28 / k + 0.12;

      // back layers swing left ↔ right (alternating direction), the front layer stays put
      const swing = k === 0 ? 0 : (2 * clamp(e, 0, 1) - 1) * s.spread * tileW * (k % 2 ? 1 : -1);
      const slide = swing + (s.slide === 'none' ? 0 : dir * clamp(e, -0.1, 1.1) * wholeShift * tileW);
      // draw enough tiles to cover the window while sliding
      const first = -2;
      const last = s.repeat + 2;
      for (let n = first; n <= last; n++) {
        const x = m + slide + n * tileW;
        if (x > m + area || x + tileW < m) continue;
        painter.text(text, compose(translate(x, baseline), scale(sx, sy)), {
          weight: w,
          tracking: s.tracking,
          fill,
          alpha,
        });
      }
    }
  }

  painter.popClip();
}
