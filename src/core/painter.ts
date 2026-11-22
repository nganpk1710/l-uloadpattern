import type { ShapeAsset } from './assets';
import type { Mat } from './math';

/** Logical frame size. Every pattern lays itself out on a 1080 × 1080 square. */
export const FRAME = 1080;

export interface ShapeOpts {
  /** single colour for the whole asset, or null to keep the asset's original colours */
  fill: string | null | ((original: string | null) => string);
  /** thickness (frame units) of the inner outline; ≥ half the shape thickness = fully solid */
  inset: number;
  alpha?: number;
}

export interface TextOpts {
  /** 100 (Thin) … 900 (Black) */
  weight: number;
  /** letter spacing in em (of the 100px text size) */
  tracking?: number;
  fill: string;
  alpha?: number;
}

/**
 * Everything a pattern needs to draw. Two implementations exist — Canvas (preview, PNG, GIF, video)
 * and SVG (vector export) — so a pattern is written once and exports identically everywhere.
 *
 * Text is always laid out at font-size 100 with its baseline at the origin; the matrix does the rest.
 */
export interface Painter {
  begin(bg: string): void;
  rect(x: number, y: number, w: number, h: number, fill: string, alpha?: number): void;
  shape(asset: ShapeAsset, m: Mat, o: ShapeOpts): void;
  text(str: string, m: Mat, o: TextOpts): void;
  pushClip(x: number, y: number, w: number, h: number): void;
  popClip(): void;
}
