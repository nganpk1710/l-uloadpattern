import type { ShapeAsset, ShapePath } from './assets';
import { matScale, type Mat } from './math';
import { FRAME, type Painter, type ShapeOpts, type TextOpts } from './painter';
import { FONT_FAMILY } from './fonts';

const pathCache = new WeakMap<ShapePath, Path2D>();
const getPath = (p: ShapePath) => {
  let path = pathCache.get(p);
  if (!path) {
    path = new Path2D(p.d);
    pathCache.set(p, path);
  }
  return path;
};

export class CanvasPainter implements Painter {
  private k: number;

  /** @param px pixel width of the canvas (square) */
  constructor(private ctx: CanvasRenderingContext2D, px: number) {
    this.k = px / FRAME;
  }

  begin(bg: string) {
    const { ctx, k } = this;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, FRAME, FRAME);
  }

  rect(x: number, y: number, w: number, h: number, fill: string, alpha = 1) {
    const { ctx } = this;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  }

  shape(asset: ShapeAsset, m: Mat, o: ShapeOpts) {
    const { ctx } = this;
    const size = Math.max(asset.vb.w, asset.vb.h);
    const inset = o.inset / matScale(m);
    const solid = inset >= size * 0.49;
    ctx.save();
    ctx.transform(...m);
    ctx.globalAlpha = o.alpha ?? 1;
    for (const sp of asset.paths) {
      const color = o.fill ?? sp.fill ?? '#111111';
      const path = getPath(sp);
      const rule = sp.evenodd ? 'evenodd' : 'nonzero';
      ctx.save();
      ctx.transform(...sp.matrix);
      if (solid) {
        ctx.fillStyle = color;
        ctx.fill(path, rule);
      } else {
        // inner outline: clip to the shape, then stroke its edge → ring of thickness `inset`
        ctx.clip(path, rule);
        ctx.strokeStyle = color;
        ctx.lineWidth = inset * 2;
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 3;
        ctx.stroke(path);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  text(str: string, m: Mat, o: TextOpts) {
    const { ctx } = this;
    ctx.save();
    ctx.transform(...m);
    ctx.globalAlpha = o.alpha ?? 1;
    ctx.font = `${Math.round(o.weight)} 100px ${FONT_FAMILY}`;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = o.fill;
    ctx.fillText(str, 0, 0);
    ctx.restore();
  }

  pushClip(x: number, y: number, w: number, h: number) {
    const { ctx } = this;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
  }

  popClip() {
    this.ctx.restore();
  }
}
