import type { ShapeAsset } from '../core/assets';
import { PATTERNS } from '../patterns';
import type { State } from '../core/state';
import { download, slug } from './download';
import { buildSvg, createFrameRenderer, type Job } from './frames';
import { exportGif } from './gif';
import { getOutliner } from './svg';
import { exportVideo } from './video';

const baseName = (state: State) => `luu-load_${slug(PATTERNS.find((p) => p.id === state.pattern)!.name)}`;

/** Runs the export the user picked and triggers the download. `t` = current loop time for still formats. */
export async function runExport(state: State, assets: ShapeAsset[], t: number, job: Job): Promise<string> {
  const e = state.export;
  const name = baseName(state);
  const dur = `${state.rhythm.duration}s`.replace('.', '_');

  switch (e.format) {
    case 'png': {
      const r = createFrameRenderer(e.pngSize);
      r.render(state, assets, t);
      const blob = await new Promise<Blob>((res, rej) => r.canvas.toBlob((b) => (b ? res(b) : rej(new Error('Không tạo được PNG'))), 'image/png'));
      const file = `${name}_${e.pngSize}.png`;
      download(blob, file);
      return file;
    }
    case 'svg': {
      job.progress(0.2, 'Đang chuyển chữ thành outline…');
      const outline = e.svgOutline ? await getOutliner() : null;
      const svg = buildSvg(state, assets, t, outline ?? undefined);
      const file = `${name}.svg`;
      download(new Blob([svg], { type: 'image/svg+xml' }), file);
      return file;
    }
    case 'gif': {
      const blob = await exportGif(state, assets, job);
      const file = `${name}_${e.gifSize}_${dur}.gif`;
      download(blob, file);
      return file;
    }
    case 'mp4':
    case 'webm': {
      const blob = await exportVideo(e.format, state, assets, job);
      const file = `${name}_${e.videoSize}_${dur}_x${e.loops}.${e.format}`;
      download(blob, file);
      return file;
    }
  }
}
