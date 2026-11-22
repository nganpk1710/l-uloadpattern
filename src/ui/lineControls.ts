import type { AssetLibrary, ShapeAsset } from '../core/assets';
import { getPath, type State, type Store } from '../core/state';
import { h } from './dom';
import type { Base, Ctl } from './controls';

const SVG = 'http://www.w3.org/2000/svg';
const DIR_CYCLE = [0, -1, 1, 2];
const SPEED_CYCLE = [1, 2, 3];

/**
 * Per-line control: one row per line (or column) with its own direction and speed.
 * Direction codes: 0 auto (follows the global direction / alternation) · -1 backwards · 1 forwards · 2 still.
 * Speeds are whole multiples, so every line still returns to its start and the loop stays seamless.
 */
export function lineTable(
  store: Store,
  o: Base & {
    label: string;
    /** path of the object that owns `lineDir` / `lineSpeed` */
    path: 'text' | 'shape';
    count: (s: State) => number;
    /** true = lines travel left/right (rows), false = up/down (columns) */
    horizontal: (s: State) => boolean;
    unit: (s: State) => string;
    hint?: string;
  },
): Ctl {
  const body = h('div', { class: 'lines' });
  const resetBtn = h('button', { type: 'button', class: 'chip chip--ghost', onclick: () => reset() }, 'Đặt lại tất cả');
  const el = h(
    'div',
    { class: 'ctl' },
    h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, o.label)),
    body,
    h('div', { class: 'seg seg--compact' }, resetBtn),
    o.hint ? h('span', { class: 'ctl__hint' }, o.hint) : null,
  );

  const arr = (s: State, k: 'lineDir' | 'lineSpeed') => getPath(s, `${o.path}.${k}`) as number[];
  const reset = () =>
    store.patch((s) => {
      arr(s, 'lineDir').fill(0);
      arr(s, 'lineSpeed').fill(1);
    });
  const cycle = (k: 'lineDir' | 'lineSpeed', i: number, list: number[]) =>
    store.patch((s) => {
      const a = arr(s, k);
      a[i] = list[(list.indexOf(a[i]) + 1) % list.length];
    });

  let built = '';
  const rows: { dir: HTMLButtonElement; speed: HTMLButtonElement }[] = [];

  return {
    el,
    sync(s) {
      if (o.show) el.hidden = !o.show(s);
      const n = Math.min(o.count(s), arr(s, 'lineDir').length);
      const horiz = o.horizontal(s);
      const key = `${n}|${horiz}|${o.unit(s)}`;
      if (key !== built) {
        built = key;
        rows.length = 0;
        body.replaceChildren(
          ...Array.from({ length: n }, (_, i) => {
            const dir = h('button', { type: 'button', class: 'line__btn', onclick: () => cycle('lineDir', i, DIR_CYCLE) });
            const speed = h('button', { type: 'button', class: 'line__btn line__btn--speed', onclick: () => cycle('lineSpeed', i, SPEED_CYCLE) });
            rows.push({ dir, speed });
            return h('div', { class: 'line' }, h('span', { class: 'line__name' }, `${o.unit(s)} ${i + 1}`), dir, speed);
          }),
        );
      }
      const dirs = arr(s, 'lineDir');
      const speeds = arr(s, 'lineSpeed');
      const glyph = (c: number) => (c === 0 ? 'Tự động' : c === 2 ? '■ Đứng' : horiz ? (c < 0 ? '← Trái' : 'Phải →') : c < 0 ? '↑ Lên' : 'Xuống ↓');
      rows.forEach((r, i) => {
        r.dir.textContent = glyph(dirs[i]);
        r.dir.dataset.state = String(dirs[i]);
        r.speed.textContent = `×${speeds[i]}`;
        r.speed.setAttribute('aria-label', `Tốc độ ${speeds[i]} lần`);
      });
    },
  };
}

/* ------------------------------------------------------------------------------------------
 * Pattern editor — click a cell to turn that shape by 90°, or switch to the mirror tool to flip it.
 * The block repeats across the whole frame, so a few clicks compose a full arrangement.
 * ---------------------------------------------------------------------------------------- */
export function patternEditor(store: Store, lib: AssetLibrary, o: Base): Ctl {
  let tool: 'turn' | 'mirror' = 'turn';
  const grid = h('div', { class: 'pe__grid' });
  const toolTurn = h('button', { type: 'button', class: 'chip', onclick: () => setTool('turn') }, '↻ Xoay 90°');
  const toolMirror = h('button', { type: 'button', class: 'chip', onclick: () => setTool('mirror') }, '⇋ Lật ngang');
  const setTool = (t: 'turn' | 'mirror') => {
    tool = t;
    toolTurn.setAttribute('aria-pressed', String(t === 'turn'));
    toolMirror.setAttribute('aria-pressed', String(t === 'mirror'));
  };
  setTool('turn');

  const el = h(
    'div',
    { class: 'ctl' },
    h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, 'Tự sắp xếp từng shape')),
    h('div', { class: 'seg seg--compact' }, toolTurn, toolMirror),
    grid,
    h(
      'div',
      { class: 'seg seg--compact' },
      h('button', { type: 'button', class: 'chip chip--ghost', onclick: () => randomise() }, '⟲ Ngẫu nhiên'),
      h('button', { type: 'button', class: 'chip chip--ghost', onclick: () => store.patch((s) => s.shape.cells.fill(0)) }, 'Đặt lại'),
    ),
    h('span', { class: 'ctl__hint' }, 'Bấm vào ô để xoay / lật. Khối này lặp khắp khung và vẫn loop liền mạch.'),
  );

  const randomise = () =>
    store.patch((s) => {
      for (let i = 0; i < s.shape.cells.length; i++) s.shape.cells[i] = Math.floor(Math.random() * 8);
    });

  const click = (i: number) =>
    store.patch((s) => {
      const c = s.shape.cells[i] ?? 0;
      s.shape.cells[i] = tool === 'turn' ? (c & 4) | (((c & 3) + 1) % 4) : c ^ 4;
    });

  const thumb = (asset: ShapeAsset, code: number) => {
    const b = asset.bbox;
    const svg = document.createElementNS(SVG, 'svg');
    const side = Math.max(b.w, b.h) * 1.08;
    svg.setAttribute('viewBox', `${-side / 2} ${-side / 2} ${side} ${side}`);
    const g = document.createElementNS(SVG, 'g');
    // same order as the renderer: quarter turn, then mirror, then centre the artwork
    g.setAttribute('transform', `rotate(${(code & 3) * 90}) scale(${code & 4 ? -1 : 1} 1) translate(${-(b.x + b.w / 2)} ${-(b.y + b.h / 2)})`);
    for (const p of asset.paths) {
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', p.d);
      path.setAttribute('transform', `matrix(${p.matrix.join(' ')})`);
      if (p.evenodd) path.setAttribute('fill-rule', 'evenodd');
      g.append(path);
    }
    svg.append(g);
    return svg;
  };

  let built = '';
  return {
    el,
    sync(s) {
      if (o.show) el.hidden = !o.show(s);
      if (el.hidden) return;
      const asset = lib.get(s.assets.selected[0]) ?? lib.list()[0];
      const { patW, patH, cells } = s.shape;
      const key = `${asset.id}|${patW}|${patH}|${cells.slice(0, patW * patH).join('')}`;
      if (key === built) return;
      built = key;
      grid.style.setProperty('--cols', String(patW));
      grid.replaceChildren(
        ...Array.from({ length: patW * patH }, (_, i) => h('button', { type: 'button', class: 'pe__cell', 'aria-label': `Ô ${i + 1}`, onclick: () => click(i) }, thumb(asset, cells[i] ?? 0))),
      );
    },
  };
}
