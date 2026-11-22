import type { AssetLibrary, ShapeAsset } from '../core/assets';
import { CanvasPainter } from '../core/canvasPainter';
import type { ExportFormat, State, Store } from '../core/state';
import { PATTERNS, renderFrame } from '../patterns';
import { runExport } from '../export';
import { ExportCancelled, framesPerLoop } from '../export/frames';
import { canEncodeVideo } from '../export/video';
import { h, html, toast } from './dom';

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor"/></svg>';

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'svg', label: 'SVG' },
  { id: 'gif', label: 'GIF' },
  { id: 'mp4', label: 'MP4' },
  { id: 'webm', label: 'WebM' },
];

export function getActiveAssets(state: State, lib: AssetLibrary): ShapeAsset[] {
  const list = state.assets.selected.map((id) => lib.get(id)).filter((a): a is ShapeAsset => !!a);
  return list.length ? list : [lib.list()[0]];
}

export function buildStage(store: Store, lib: AssetLibrary) {
  /* ───────── tabs ───────── */
  const tabs = PATTERNS.map((p) =>
    h(
      'button',
      { type: 'button', class: 'tab', role: 'tab', id: `tab-${p.id}`, 'aria-controls': 'frame', onclick: () => store.set('pattern', p.id) },
      h('span', { class: 'tab__index' }, p.index),
      h('span', { class: 'tab__name' }, p.name),
      h('span', { class: 'tab__sub' }, p.sub),
    ),
  );
  const tabbar = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Loại pattern' }, ...tabs);

  /* ───────── preview ───────── */
  const canvas = h('canvas', { class: 'frame__canvas', role: 'img', 'aria-label': 'Xem trước pattern khung 1:1' });
  const meta = h('span', { class: 'frame__meta' });
  const frameBox = h('div', { class: 'frame', id: 'frame' }, canvas);
  const frameWrap = h('div', { class: 'stage__view' }, h('div', { class: 'frame-holder' }, frameBox, meta));
  const ctx = canvas.getContext('2d', { alpha: false })!;
  let painter: CanvasPainter | null = null;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let phase = reduceMotion ? 0.45 : 0;
  let playing = !reduceMotion;
  let dirty = true;
  let last = 0;

  const fit = () => {
    const rect = frameBox.getBoundingClientRect();
    const css = Math.max(120, Math.round(rect.width));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = Math.round(css * dpr);
    if (canvas.width !== px) {
      canvas.width = px;
      canvas.height = px;
      painter = new CanvasPainter(ctx, px);
      dirty = true;
    }
  };
  new ResizeObserver(fit).observe(frameBox);

  /* ───────── transport ───────── */
  const playBtn = h('button', { type: 'button', class: 'play', 'aria-label': 'Phát / dừng' });
  const scrub = h('input', { class: 'rng', type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Vị trí trong vòng loop' });
  const timeOut = h('output', { class: 'time' });
  const setPlaying = (v: boolean) => {
    playing = v;
    playBtn.replaceChildren(html(v ? ICON_PAUSE : ICON_PLAY));
    playBtn.setAttribute('aria-pressed', String(v));
    dirty = true;
  };
  playBtn.addEventListener('click', () => setPlaying(!playing));
  scrub.addEventListener('input', () => {
    phase = +scrub.value / 1000;
    if (playing) setPlaying(false);
    dirty = true;
  });
  const transport = h('div', { class: 'transport' }, playBtn, scrub, timeOut);
  setPlaying(playing);

  /* ───────── export dock ───────── */
  const abort = { current: null as AbortController | null };
  const formatChips = FORMATS.map((f) =>
    h('button', { type: 'button', class: 'chip', 'aria-pressed': 'false', onclick: () => store.set('export.format', f.id) }, f.label),
  );
  const optsHost = h('div', { class: 'dock__opts' });
  const info = h('span', { class: 'dock__info' });
  const goLabel = h('span', {}, 'Xuất file');
  const bar = h('span', { class: 'dock__bar' });
  const goBtn = h('button', { type: 'button', class: 'btn btn--primary dock__go' }, goLabel, bar);
  const cancelBtn = h('button', { type: 'button', class: 'btn btn--ghost dock__cancel', hidden: true }, 'Huỷ');

  const opt = <V extends string | number>(label: string, path: string, choices: [V, string][], current: V) =>
    h(
      'div',
      { class: 'dock__opt' },
      h('span', { class: 'ctl__label' }, label),
      h(
        'div',
        { class: 'seg seg--compact' },
        ...choices.map(([v, text]) =>
          h('button', { type: 'button', class: 'chip', 'aria-pressed': String(v === current), onclick: () => store.set(path, v) }, text),
        ),
      ),
    );

  let optsKey = '';
  const renderOpts = (s: State) => {
    const e = s.export;
    const key = JSON.stringify([e.format, e.pngSize, e.svgOutline, e.gifSize, e.gifFps, e.videoSize, e.videoFps, e.loops]);
    if (key === optsKey) return;
    optsKey = key;
    const parts: HTMLElement[] = [];
    if (e.format === 'png') {
      parts.push(opt('Kích thước', 'export.pngSize', [[1080, '1080'], [2160, '2160'], [4096, '4096']], e.pngSize));
    } else if (e.format === 'svg') {
      parts.push(
        opt('Chữ', 'export.svgOutline', [[true as any, 'Outline (vector)'], [false as any, 'Text sống']], e.svgOutline as any),
      );
    } else if (e.format === 'gif') {
      parts.push(opt('Kích thước', 'export.gifSize', [[360, '360'], [540, '540'], [720, '720']], e.gifSize));
      parts.push(opt('FPS', 'export.gifFps', [[20, '20'], [25, '25']], e.gifFps));
    } else {
      parts.push(opt('Kích thước', 'export.videoSize', [[720, '720'], [1080, '1080'], [1440, '1440']], e.videoSize));
      parts.push(opt('FPS', 'export.videoFps', [[30, '30'], [60, '60']], e.videoFps));
      parts.push(opt('Số vòng loop', 'export.loops', [[1, '1'], [2, '2'], [3, '3'], [4, '4']], e.loops));
    }
    optsHost.replaceChildren(...parts);
  };

  const dock = h(
    'div',
    { class: 'dock' },
    h(
      'div',
      { class: 'dock__left' },
      h('div', { class: 'dock__formats', role: 'group', 'aria-label': 'Định dạng xuất' }, h('span', { class: 'ctl__label' }, 'Xuất file'), h('div', { class: 'seg seg--compact' }, ...formatChips)),
      optsHost,
    ),
    h('div', { class: 'dock__action' }, h('div', { class: 'dock__buttons' }, cancelBtn, goBtn), info),
  );

  const setBusy = (busy: boolean) => {
    goBtn.disabled = busy;
    cancelBtn.hidden = !busy;
    dock.classList.toggle('is-busy', busy);
    if (!busy) {
      bar.style.transform = 'scaleX(0)';
      goLabel.textContent = 'Xuất file';
    }
  };

  goBtn.addEventListener('click', async () => {
    const s = store.state;
    if ((s.export.format === 'mp4' || s.export.format === 'webm') && !canEncodeVideo()) {
      toast('Trình duyệt chưa hỗ trợ xuất video. Hãy dùng Chrome, Edge hoặc Safari bản mới.', 'error');
      return;
    }
    abort.current = new AbortController();
    setBusy(true);
    try {
      const file = await runExport(structuredClone(s), getActiveAssets(s, lib), phase, {
        signal: abort.current.signal,
        progress: (r, label) => {
          bar.style.transform = `scaleX(${r})`;
          goLabel.textContent = label ?? `${Math.round(r * 100)}%`;
        },
      });
      toast(`Đã xuất ${file}`);
    } catch (err) {
      if (!(err instanceof ExportCancelled)) {
        console.error(err);
        toast((err as Error).message || 'Xuất file không thành công', 'error');
      }
    } finally {
      setBusy(false);
      abort.current = null;
    }
  });
  cancelBtn.addEventListener('click', () => abort.current?.abort());

  /* ───────── sync + loop ───────── */
  const sync = (s: State) => {
    tabs.forEach((t, i) => {
      const on = PATTERNS[i].id === s.pattern;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    formatChips.forEach((c, i) => c.setAttribute('aria-pressed', String(FORMATS[i].id === s.export.format)));
    renderOpts(s);

    const e = s.export;
    const fps = e.format === 'gif' ? e.gifFps : e.videoFps;
    if (e.format === 'png') info.textContent = `Khung hình hiện tại · ${e.pngSize} × ${e.pngSize}px`;
    else if (e.format === 'svg') info.textContent = 'Khung hình hiện tại · vector 1080 × 1080';
    else {
      const frames = framesPerLoop(s.rhythm.duration, fps) * (e.format === 'gif' ? 1 : e.loops);
      info.textContent = `${frames} khung · ${(frames / fps).toFixed(1)}s · loop liền mạch`;
    }
    meta.textContent = `1:1 · LOOP ${s.rhythm.duration.toFixed(1)}s`;
    dirty = true;
  };

  const tick = (now: number) => {
    const s = store.state;
    const dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    if (playing) {
      phase = (phase + dt / (s.rhythm.duration * 1000)) % 1;
      dirty = true;
    }
    if (dirty && painter) {
      renderFrame({ painter, state: s, assets: getActiveAssets(s, lib), t: phase });
      dirty = false;
      scrub.value = String(Math.round(phase * 1000));
      scrub.style.setProperty('--p', `${phase * 100}%`);
      timeOut.textContent = `${(phase * s.rhythm.duration).toFixed(1).padStart(4, '0')} / ${s.rhythm.duration.toFixed(1)}s`;
      document.documentElement.style.setProperty('--load', String(phase));
    }
    requestAnimationFrame(tick);
  };

  return {
    tabbar,
    frameWrap,
    transport,
    dock,
    sync,
    start() {
      fit();
      requestAnimationFrame(tick);
    },
    togglePlay: () => setPlaying(!playing),
    isPlaying: () => playing,
    step(dir: number) {
      if (playing) setPlaying(false);
      phase = (phase + dir * 0.02 + 1) % 1;
      dirty = true;
    },
    markDirty() {
      dirty = true;
    },
    reducedMotion: reduceMotion,
  };
}
