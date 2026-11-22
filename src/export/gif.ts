import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import type { ShapeAsset } from '../core/assets';
import type { State } from '../core/state';
import { createFrameRenderer, ExportCancelled, framesPerLoop, sleepFrame, type Job } from './frames';

/**
 * One loop → GIF. A single global palette (sampled across the whole loop) keeps colours stable
 * and avoids the flicker you get from per-frame palettes.
 */
export async function exportGif(state: State, assets: ShapeAsset[], job: Job): Promise<Blob> {
  const { gifSize: size, gifFps: fps } = state.export;
  const n = framesPerLoop(state.rhythm.duration, fps);
  const r = createFrameRenderer(size);

  // 1 — build the palette from a spread of frames
  const samples: Uint8ClampedArray[] = [];
  const sampleCount = Math.min(8, n);
  for (let s = 0; s < sampleCount; s++) {
    r.render(state, assets, (s / sampleCount) % 1);
    samples.push(r.ctx.getImageData(0, 0, size, size).data);
    if (job.signal.aborted) throw new ExportCancelled();
  }
  const merged = new Uint8Array(samples.reduce((a, b) => a + b.length, 0));
  let o = 0;
  for (const s of samples) {
    merged.set(s, o);
    o += s.length;
  }
  const palette = quantize(merged, 256, { format: 'rgb444' });

  // 2 — encode every frame
  const gif = GIFEncoder();
  const delay = Math.round(1000 / fps);
  for (let f = 0; f < n; f++) {
    if (job.signal.aborted) throw new ExportCancelled();
    r.render(state, assets, f / n);
    const { data } = r.ctx.getImageData(0, 0, size, size);
    const index = applyPalette(data, palette, 'rgb444');
    gif.writeFrame(index, size, size, { palette: f === 0 ? palette : undefined, delay, repeat: 0 });
    job.progress((f + 1) / n, `Khung ${f + 1}/${n}`);
    if (f % 3 === 2) await sleepFrame();
  }
  gif.finish();
  return new Blob([gif.bytes() as BlobPart], { type: 'image/gif' });
}
