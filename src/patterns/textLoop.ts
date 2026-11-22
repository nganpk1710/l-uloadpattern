import { capHeight, measure } from '../core/fonts';
import { compose, frac, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import { pickColor, type RenderContext } from './types';

const mod = (n: number, m: number) => ((n % m) + m) % m;

/**
 * 02 · Text — Loop. The type is a repeated background: identical lines of ultra-tall text tiled across
 * the frame that travel in one direction forever (no ping-pong). The motion always covers a whole number
 * of tiles / colour periods, so the last frame meets the first and the loop is seamless.
 */
export function renderTextLoop({ painter, state, t }: RenderContext) {
  const s = state.text;
  const text = s.upper ? (s.content || ' ').toUpperCase() : s.content || ' ';
  const m = FRAME * s.margin;
  const area = FRAME - m * 2;
  const rowH = area / s.rows;
  const glyphH = rowH * (1 - s.gap);
  const cap = capHeight();
  const sy = glyphH / cap;
  const tileW = area / s.repeat;
  const met = measure(text, s.weight, s.tracking);
  const sx = tileW / (met.adv + cap * s.wordGap);

  const horizontal = s.dir === 'l' || s.dir === 'r';
  const sign = s.dir === 'l' || s.dir === 'u' ? -1 : 1;

  // vertical travel must be a whole number of colour periods
  const fgN = state.color.fg.length;
  const mode = state.color.mode;
  const colorPeriod = mode === 'col' ? 1 : mode === 'random' ? s.rows : fgN;

  // constant speed: `laps` tiles (horizontal) or colour periods (vertical) per loop
  const pos = frac(t) * Math.max(1, Math.round(s.laps)) * (horizontal ? 1 : colorPeriod);
  const k = Math.floor(pos);
  const f = pos - k;

  painter.pushClip(m, m, area, area);
  for (let sj = -1; sj <= s.rows + 1; sj++) {
    for (let n = -2; n <= s.repeat + 2; n++) {
      let x = m + n * tileW;
      let y = m + sj * rowH;
      let vr = sj;
      if (horizontal) {
        const d = s.alt ? (mod(sj, 2) ? -1 : 1) * sign : sign;
        x += d * f * tileW;
      } else {
        const d = s.alt ? (mod(n, 2) ? -1 : 1) * sign : sign;
        y += d * f * rowH;
        vr = sj - d * k;
      }
      if (x > m + area || x + tileW < m || y > m + area || y + rowH < m) continue;
      const baseline = y + (rowH - glyphH) / 2 + glyphH;
      painter.text(text, compose(translate(x, baseline), scale(sx, sy)), {
        weight: s.weight,
        tracking: s.tracking,
        fill: pickColor(state, mode === 'col' ? n + 2 : 0, mod(vr, colorPeriod)),
      });
    }
  }
  painter.popClip();
}
