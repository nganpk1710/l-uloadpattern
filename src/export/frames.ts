import { CanvasPainter } from '../core/canvasPainter';
import type { ShapeAsset } from '../core/assets';
import type { State } from '../core/state';
import { SvgPainter, type Outliner } from '../core/svgPainter';
import { renderFrame } from '../patterns';

/** An off-screen canvas that renders any loop time t at an exact pixel size. */
export function createFrameRenderer(size: number) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const painter = new CanvasPainter(ctx, size);
  return {
    canvas,
    ctx,
    render(state: State, assets: ShapeAsset[], t: number) {
      renderFrame({ painter, state, assets, t });
    },
  };
}

export function buildSvg(state: State, assets: ShapeAsset[], t: number, outline?: Outliner): string {
  const painter = new SvgPainter(outline);
  renderFrame({ painter, state, assets, t });
  return painter.toString();
}

/** Number of frames in one seamless loop. */
export const framesPerLoop = (duration: number, fps: number) => Math.max(2, Math.round(duration * fps));

export const sleepFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

export class ExportCancelled extends Error {
  constructor() {
    super('Đã huỷ xuất file');
  }
}

export interface Job {
  signal: AbortSignal;
  progress: (ratio: number, label?: string) => void;
}
