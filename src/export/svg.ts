import { BIG_SHOULDERS_URL, measure } from '../core/fonts';
import type { Outliner } from '../core/svgPainter';

let cached: Outliner | null | undefined;

const f = (n: number) => String(Math.round(n * 100) / 100);

/**
 * Turns text into vector outlines (opentype.js reads the variable font at the exact weight),
 * so exported SVGs open correctly in Figma / Illustrator without the font installed.
 *
 * Glyphs are laid out one by one rather than via getPath(string): opentype.js 2.0 applies GPOS kerning
 * without variation deltas, which scrambles letter positions at heavy weights. We then stretch the run
 * to the advance width the canvas measured, so the SVG lines up exactly with the preview.
 *
 * Loaded lazily — it is only paid for when the user exports an SVG.
 */
export async function getOutliner(): Promise<Outliner | null> {
  if (cached !== undefined) return cached;
  try {
    const [ot, buf] = await Promise.all([
      import('opentype.js'),
      fetch(BIG_SHOULDERS_URL).then((r) => r.arrayBuffer()),
    ]);
    const font = ot.parse(buf);
    const upm = (font as unknown as { unitsPerEm: number }).unitsPerEm || 1000;
    const memo = new Map<string, string>();

    cached = (str, weight) => {
      const w = Math.round(weight);
      const key = `${w}|${str}`;
      let d = memo.get(key);
      if (d != null) return d;

      font.variation.set({ wght: w, opsz: 72 });
      const chars = Array.from(str.normalize('NFC'));
      let x = 0;
      const placed: { cmds: any[]; x: number }[] = [];
      for (const ch of chars) {
        const glyph = font.charToGlyph(ch);
        placed.push({ cmds: font.getPath(ch, x, 0, 100).commands, x });
        x += (glyph.advanceWidth * 100) / upm;
      }
      const target = measure(str, w).adv;
      const k = x > 0 && target > 0 ? target / x : 1;

      d = placed
        .flatMap((p) => p.cmds)
        .map((c) => {
          switch (c.type) {
            case 'M':
            case 'L':
              return `${c.type}${f(c.x * k)} ${f(c.y)}`;
            case 'Q':
              return `Q${f(c.x1 * k)} ${f(c.y1)} ${f(c.x * k)} ${f(c.y)}`;
            case 'C':
              return `C${f(c.x1 * k)} ${f(c.y1)} ${f(c.x2 * k)} ${f(c.y2)} ${f(c.x * k)} ${f(c.y)}`;
            default:
              return 'Z';
          }
        })
        .join('');
      memo.set(key, d);
      return d;
    };
  } catch (err) {
    console.warn('Không tạo được outline chữ, dùng <text> thay thế', err);
    cached = null;
  }
  return cached;
};
