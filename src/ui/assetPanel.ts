import type { AssetLibrary, ShapeAsset } from '../core/assets';
import { CanvasPainter } from '../core/canvasPainter';
import { compose, scale, translate } from '../core/math';
import { FRAME } from '../core/painter';
import type { State, Store } from '../core/state';
import { h, toast } from './dom';
import type { Base, Ctl } from './controls';

const THUMB = 96;

function drawThumb(canvas: HTMLCanvasElement, asset: ShapeAsset, color: string | null) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const px = Math.round(THUMB * dpr);
  if (canvas.width !== px) {
    canvas.width = px;
    canvas.height = px;
  }
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, px, px);
  const painter = new CanvasPainter(ctx, px);
  painter.begin('transparent');
  const pad = 150;
  const fit = (FRAME - pad * 2) / Math.max(asset.vb.w, asset.vb.h);
  painter.shape(
    asset,
    compose(
      translate(FRAME / 2, FRAME / 2),
      scale(fit),
      translate(-(asset.vb.x + asset.vb.w / 2), -(asset.vb.y + asset.vb.h / 2)),
    ),
    { fill: color, inset: 9999 },
  );
}

/**
 * Asset manager: toggle which shapes feed the patterns, upload your own SVGs (click or drag & drop),
 * remove uploads, and choose between brand colours and the artwork's original colours.
 */
export function assetPanel(store: Store, lib: AssetLibrary, o: Base = {}): Ctl {
  const grid = h('div', { class: 'assets' });
  const keep = h('input', { type: 'checkbox', class: 'switch__input' });
  keep.addEventListener('change', () => store.set('assets.keepColors', keep.checked));

  const file = h('input', { type: 'file', accept: '.svg,image/svg+xml', multiple: true, class: 'sr-only', 'aria-label': 'Tải SVG lên' });
  const upload = async (files: FileList | File[]) => {
    let added = 0;
    for (const f of Array.from(files)) {
      if (!/\.svg$/i.test(f.name) && f.type !== 'image/svg+xml') {
        toast(`“${f.name}” không phải file SVG`, 'error');
        continue;
      }
      if (f.size > 1_500_000) {
        toast(`“${f.name}” quá nặng (tối đa 1.5MB)`, 'error');
        continue;
      }
      const a = lib.addFromSvg(await f.text(), f.name);
      if (!a) {
        toast(`Không đọc được hình khối trong “${f.name}”`, 'error');
        continue;
      }
      store.patch((s) => s.assets.selected.push(a.id));
      added++;
    }
    if (added) toast(`Đã thêm ${added} asset`);
  };
  file.addEventListener('change', () => {
    if (file.files?.length) void upload(file.files);
    file.value = '';
  });

  const all = h('button', { type: 'button', class: 'link', onclick: () => store.patch((s) => (s.assets.selected = lib.list().map((a) => a.id))) }, 'Chọn tất cả');
  const none = h('button', { type: 'button', class: 'link', onclick: () => store.patch((s) => (s.assets.selected = [lib.list()[0].id])) }, 'Chỉ giữ một');
  const count = h('span', { class: 'ctl__hint ctl__hint--inline' });

  const el = h(
    'div',
    { class: 'ctl assets-wrap' },
    h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, 'Thư viện Assets'), count),
    grid,
    h('div', { class: 'assets-actions' }, all, none),
    h('label', { class: 'ctl ctl--switch' }, h('span', { class: 'switch' }, keep, h('span', { class: 'switch__box' })), h('span', { class: 'switch__text' }, h('span', { class: 'ctl__label' }, 'Giữ màu gốc của asset'), h('span', { class: 'ctl__hint' }, 'Tắt = tô theo bộ màu thương hiệu'))),
    file,
  );

  // drag & drop SVGs anywhere on the panel
  el.addEventListener('dragover', (e) => {
    e.preventDefault();
    el.classList.add('is-drop');
  });
  el.addEventListener('dragleave', () => el.classList.remove('is-drop'));
  el.addEventListener('drop', (e) => {
    e.preventDefault();
    el.classList.remove('is-drop');
    if (e.dataTransfer?.files.length) void upload(e.dataTransfer.files);
  });

  let renderedKey = '';
  let drawnKey = '';
  const build = (s: State) => {
    const items = lib.list();
    const tiles = items.map((a) => {
      const canvas = h('canvas', { class: 'asset__thumb', width: THUMB, height: THUMB, 'aria-hidden': 'true' });
      const on = s.assets.selected.includes(a.id);
      const btn = h(
        'button',
        {
          type: 'button',
          class: 'asset',
          title: a.name,
          'aria-label': a.name,
          'aria-pressed': String(on),
          dataset: { id: a.id },
          onclick: () =>
            store.patch((st) => {
              const i = st.assets.selected.indexOf(a.id);
              if (i >= 0) {
                if (st.assets.selected.length > 1) st.assets.selected.splice(i, 1);
              } else st.assets.selected.push(a.id);
            }),
        },
        canvas,
        h('span', { class: 'asset__name' }, a.name),
      );
      const cell = h('div', { class: 'asset-cell' }, btn);
      if (!a.builtin) {
        cell.append(
          h(
            'button',
            {
              type: 'button',
              class: 'asset__remove',
              'aria-label': `Xoá ${a.name}`,
              title: 'Xoá asset này',
              onclick: () =>
                store.patch((st) => {
                  lib.remove(a.id);
                  st.assets.selected = st.assets.selected.filter((x) => x !== a.id);
                  if (!st.assets.selected.length) st.assets.selected = [lib.list()[0].id];
                }),
            },
            '×',
          ),
        );
      }
      return cell;
    });
    const add = h(
      'button',
      { type: 'button', class: 'asset asset--add', title: 'Tải SVG của bạn lên', onclick: () => file.click() },
      h('span', { class: 'asset__plus' }, '+'),
      h('span', { class: 'asset__name' }, 'Thêm SVG'),
    );
    grid.replaceChildren(...tiles, add);
  };

  return {
    el,
    sync(s) {
      if (o.show) el.hidden = !o.show(s);
      if (el.hidden) return;
      const key = lib.list().map((a) => a.id).join('|');
      if (key !== renderedKey) {
        renderedKey = key;
        build(s);
      }
      const color = s.assets.keepColors ? null : s.color.fg[0];
      const thumbKey = `${key}|${color}`;
      const redraw = thumbKey !== drawnKey; // thumbnails only change with colour or library
      drawnKey = thumbKey;
      grid.querySelectorAll<HTMLButtonElement>('.asset[data-id]').forEach((btn) => {
        const id = btn.dataset.id!;
        btn.setAttribute('aria-pressed', String(s.assets.selected.includes(id)));
        if (!redraw) return;
        const a = lib.get(id);
        const canvas = btn.querySelector('canvas');
        if (a && canvas) drawThumb(canvas, a, color);
      });
      el.style.setProperty('--tile', s.color.bg);
      keep.checked = s.assets.keepColors;
      count.textContent = `${s.assets.selected.length}/${lib.list().length} đang dùng`;
    },
  };
}
