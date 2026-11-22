import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from 'mp4-muxer';
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from 'webm-muxer';
import type { ShapeAsset } from '../core/assets';
import type { State } from '../core/state';
import { createFrameRenderer, ExportCancelled, framesPerLoop, sleepFrame, type Job } from './frames';

export const canEncodeVideo = () => typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';

const AVC_CODECS = ['avc1.640033', 'avc1.640028', 'avc1.4d0028', 'avc1.42001f'];

async function pickConfig(format: 'mp4' | 'webm', size: number, fps: number) {
  const bitrate = Math.round(size * size * fps * 0.22);
  const candidates =
    format === 'mp4'
      ? AVC_CODECS.map((codec) => ({ codec, width: size, height: size, bitrate, framerate: fps }))
      : [
          { codec: 'vp09.00.40.08', width: size, height: size, bitrate, framerate: fps },
          { codec: 'vp8', width: size, height: size, bitrate, framerate: fps },
        ];
  for (const c of candidates) {
    try {
      const res = await VideoEncoder.isConfigSupported(c);
      if (res.supported) return c;
    } catch {
      /* try the next */
    }
  }
  return null;
}

/** Frame-exact video export through WebCodecs: faster than real time and perfectly loop-aligned. */
export async function exportVideo(
  format: 'mp4' | 'webm',
  state: State,
  assets: ShapeAsset[],
  job: Job,
): Promise<Blob> {
  if (!canEncodeVideo()) throw new Error('Trình duyệt chưa hỗ trợ xuất video (WebCodecs). Hãy dùng Chrome, Edge hoặc Safari mới.');
  const { videoSize: size, videoFps: fps, loops } = state.export;
  const config = await pickConfig(format, size, fps);
  if (!config) {
    throw new Error(
      format === 'mp4'
        ? 'Trình duyệt này không mã hoá được H.264. Thử định dạng WebM.'
        : 'Trình duyệt này không mã hoá được WebM. Thử định dạng MP4.',
    );
  }

  const per = framesPerLoop(state.rhythm.duration, fps);
  const total = per * loops;
  const r = createFrameRenderer(size);

  let muxer: Mp4Muxer<Mp4Target> | WebmMuxer<WebmTarget>;
  let target: Mp4Target | WebmTarget;
  if (format === 'mp4') {
    target = new Mp4Target();
    muxer = new Mp4Muxer({ target, video: { codec: 'avc', width: size, height: size }, fastStart: 'in-memory' });
  } else {
    target = new WebmTarget();
    muxer = new WebmMuxer({
      target,
      video: { codec: config.codec.startsWith('vp8') ? 'V_VP8' : 'V_VP9', width: size, height: size, frameRate: fps },
    });
  }

  let encoderError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => (muxer as any).addVideoChunk(chunk, meta),
    error: (e) => (encoderError = e as Error),
  });
  encoder.configure(config);

  try {
    for (let f = 0; f < total; f++) {
      if (job.signal.aborted) throw new ExportCancelled();
      if (encoderError) throw encoderError;
      r.render(state, assets, (f % per) / per);
      const frame = new VideoFrame(r.canvas, { timestamp: Math.round((f * 1e6) / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: f % (fps * 2) === 0 });
      frame.close();
      job.progress((f + 1) / total, `Khung ${f + 1}/${total}`);
      // back-pressure + keep the UI responsive
      if (encoder.encodeQueueSize > 8) await new Promise((res) => setTimeout(res, 0));
      else if (f % 4 === 3) await sleepFrame();
    }
    await encoder.flush();
  } finally {
    if (encoder.state !== 'closed') encoder.close();
  }
  if (encoderError) throw encoderError;
  muxer.finalize();
  const buffer = (target as Mp4Target).buffer;
  return new Blob([buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
}
