import type { ShapeAsset } from './assets';
import { matScale, round, type Mat } from './math';
import { FRAME, type Painter, type ShapeOpts, type TextOpts } from './painter';
import { FONT_FAMILY } from './fonts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const mat = (m: Mat) => `matrix(${m.map((v) => round(v, 4)).join(' ')})`;
const isIdentity = (m: Mat) => m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1 && m[4] === 0 && m[5] === 0;

/** Returns SVG path data for a string at font-size 100 (baseline at origin), or null if unavailable. */
export type Outliner = (str: string, weight: number) => string | null;

/**
 * Vector backend. Produces a standalone SVG that mirrors the canvas output.
 * Shapes are emitted as <use> of shared <path> defs; the inner-outline weight effect is a clipped stroke.
 */
export class SvgPainter implements Painter {
  private defs: string[] = [];
  private body: string[] = [];
  private defined = new Set<string>();
  private clipSeq = 0;
  private bg = '#fff';

  constructor(private outline?: Outliner) {}

  begin(bg: string) {
    this.bg = bg;
    this.body.push(`<rect width="${FRAME}" height="${FRAME}" fill="${bg}"/>`);
  }

  rect(x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
    const op = alpha < 1 ? ` fill-opacity="${round(alpha, 3)}"` : '';
    this.body.push(`<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${fill}"${op}/>`);
  }

  private define(asset: ShapeAsset) {
    if (this.defined.has(asset.id)) return;
    this.defined.add(asset.id);
    asset.paths.forEach((p, k) => {
      const tr = isIdentity(p.matrix) ? '' : ` transform="${mat(p.matrix)}"`;
      const rule = p.evenodd ? ' fill-rule="evenodd" clip-rule="evenodd"' : '';
      const id = `${esc(asset.id)}-${k}`;
      this.defs.push(`<path id="p-${id}" d="${esc(p.d)}"${tr}${rule}/>`);
      this.defs.push(`<clipPath id="c-${id}"><use href="#p-${id}"/></clipPath>`);
    });
  }

  shape(asset: ShapeAsset, m: Mat, o: ShapeOpts) {
    this.define(asset);
    const size = Math.max(asset.vb.w, asset.vb.h);
    const inset = o.inset / matScale(m);
    const solid = inset >= size * 0.49;
    const op = o.alpha != null && o.alpha < 1 ? ` opacity="${round(o.alpha, 3)}"` : '';
    const out: string[] = [`<g transform="${mat(m)}"${op}>`];
    asset.paths.forEach((sp, k) => {
      const color = typeof o.fill === 'function' ? o.fill(sp.fill) : (o.fill ?? sp.fill ?? '#111111');
      const id = `${esc(asset.id)}-${k}`;
      if (solid) {
        out.push(`<use href="#p-${id}" fill="${color}"/>`);
      } else {
        out.push(
          `<g clip-path="url(#c-${id})"><use href="#p-${id}" fill="none" stroke="${color}" stroke-width="${round(inset * 2, 3)}" stroke-miterlimit="3"/></g>`,
        );
      }
    });
    out.push('</g>');
    this.body.push(out.join(''));
  }

  text(str: string, m: Mat, o: TextOpts) {
    const op = o.alpha != null && o.alpha < 1 ? ` fill-opacity="${round(o.alpha, 3)}"` : '';
    const d = this.outline?.(str, o.weight);
    if (d) {
      this.body.push(`<path d="${d}" transform="${mat(m)}" fill="${o.fill}"${op}/>`);
    } else {
      // Live text fallback — needs "Big Shoulders" installed on the viewing machine
      const family = FONT_FAMILY.replace(/"/g, "'");
      this.body.push(
        `<text transform="${mat(m)}" font-family="${family}" font-size="100" font-weight="${Math.round(o.weight)}" fill="${o.fill}"${op}>${esc(str)}</text>`,
      );
    }
  }

  pushClip(x: number, y: number, w: number, h: number) {
    const id = `clip-${this.clipSeq++}`;
    this.defs.push(`<clipPath id="${id}"><rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}"/></clipPath>`);
    this.body.push(`<g clip-path="url(#${id})">`);
  }

  popClip() {
    this.body.push('</g>');
  }

  toString(meta = 'Lưu Load — Motion Pattern Toolkit'): string {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${FRAME} ${FRAME}" width="${FRAME}" height="${FRAME}" style="background:${this.bg}">`,
      `<title>${esc(meta)}</title>`,
      `<defs>${this.defs.join('')}</defs>`,
      ...this.body,
      '</svg>',
    ].join('\n');
  }
}
