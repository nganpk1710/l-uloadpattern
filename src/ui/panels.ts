import type { AssetLibrary } from '../core/assets';
import { randomPalette } from '../core/color';
import type { Store } from '../core/state';
import { assetPanel } from './assetPanel';
import {
  colorPresets,
  EASING_OPTIONS,
  segmented,
  slider,
  swatches,
  textField,
  toggle,
  weightRange,
  type Ctl,
} from './controls';
import { h } from './dom';

const sec = (index: string, title: string, sub: string, ...ctls: Ctl[]) => {
  const el = h(
    'section',
    { class: 'sec' },
    h('header', { class: 'sec__head' }, h('span', { class: 'sec__index' }, index), h('h2', { class: 'sec__title' }, title), h('span', { class: 'sec__sub' }, sub)),
    h('div', { class: 'sec__body' }, ...ctls.map((c) => c.el)),
  );
  return { el, ctls };
};

const sec_s = (v: number) => `${v.toFixed(1)}s`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const times = (v: number) => `${v}×`;

export function buildPanels(store: Store, lib: AssetLibrary) {
  const isShape = (s: { pattern: string }) => s.pattern === 'shape';
  const isText = (s: { pattern: string }) => s.pattern === 'text';
  const isWide = (s: { pattern: string }) => s.pattern === 'wide';

  /* ───────────── LEFT · Nội dung & Màu ───────────── */
  const content = sec(
    '01',
    'Nội dung',
    'Assets đầu vào',
    assetPanel(store, lib, { show: (s) => isShape(s) || (isWide(s) && s.wide.mode === 'shape') }),
    textField(store, {
      label: 'Dòng chữ',
      path: 'text.content',
      placeholder: 'LƯU LOAD',
      maxLength: 24,
      chips: ['LƯU LOAD', 'NẠP LẠI', 'CÀ PHÊ VỈA HÈ'],
      hint: 'Tự động viết hoa · hỗ trợ đủ dấu tiếng Việt',
      show: isText,
    }),
    segmented(store, {
      label: 'Chất liệu mỗi ô',
      path: 'wide.mode',
      options: [
        { value: 'text', label: 'Chữ' },
        { value: 'shape', label: 'Shape' },
      ],
      show: isWide,
    }),
    textField(store, {
      label: 'Chuỗi ký tự',
      path: 'wide.chars',
      placeholder: 'LƯULOAD',
      maxLength: 24,
      chips: ['LƯULOAD', 'NẠPLẠI', 'ABCDEFG'],
      hint: 'Mỗi ký tự lần lượt nằm trong một cột',
      show: (s) => isWide(s) && s.wide.mode === 'text',
    }),
  );

  const diceBtn = {
    el: h(
      'button',
      {
        type: 'button',
        class: 'btn btn--ghost btn--block',
        onclick: () =>
          store.patch((s) => {
            s.color.seed = (Math.random() * 1e6) | 0;
            const p = randomPalette(Math.random);
            s.color.bg = p.bg;
            s.color.fg = p.fg;
          }),
      },
      '⟲  Phối màu ngẫu nhiên',
    ),
    sync() {},
  } as Ctl;

  const colors = sec(
    '02',
    'Màu thương hiệu',
    '8 màu',
    colorPresets(store),
    swatches(store, { label: 'Nền khung', kind: 'bg' }),
    swatches(store, { label: 'Màu hình / chữ', kind: 'fg' }),
    segmented(store, {
      label: 'Cách phân màu',
      path: 'color.mode',
      options: [
        { value: 'cycle', label: 'Chéo' },
        { value: 'row', label: 'Theo hàng' },
        { value: 'col', label: 'Theo cột' },
        { value: 'random', label: 'Ngẫu nhiên' },
      ],
    }),
    diceBtn,
  );

  /* ───────────── RIGHT · điều khiển chuyển động ───────────── */
  const rhythm = sec(
    '03',
    'Nhịp điệu',
    'Rhythm & Easing',
    slider(store, { label: 'Thời lượng 1 vòng loop', path: 'rhythm.duration', min: 0.8, max: 12, step: 0.1, fmt: sec_s }),
    segmented(store, { label: 'Easing', path: 'rhythm.easing', options: EASING_OPTIONS, compact: true }),
    segmented(store, {
      label: 'Kiểu lặp',
      path: 'rhythm.loop',
      options: [
        { value: 'pingpong', label: 'Mượt · đi & về', title: 'Thin → Black → Thin, liền mạch' },
        { value: 'load', label: 'Nạp · reset', title: 'Nạp đầy rồi quay lại đầu như thanh loading' },
      ],
    }),
    slider(store, { label: 'Độ lan sóng', path: 'rhythm.stagger', min: -1, max: 1, step: 0.01, fmt: (v) => (v > 0 ? '+' : '') + pct(v), hint: '0% = cả khung chuyển động cùng lúc · âm = đảo hướng' }),
    segmented(store, {
      label: 'Hướng lan',
      path: 'rhythm.wave',
      options: [
        { value: 'diag', label: 'Chéo' },
        { value: 'row', label: 'Hàng' },
        { value: 'col', label: 'Cột' },
        { value: 'radial', label: 'Tâm' },
        { value: 'random', label: 'Ngẫu nhiên' },
      ],
      compact: true,
    }),
    segmented(store, {
      label: 'Chuyển động hình',
      path: 'shape.motion',
      options: [
        { value: 'weight', label: 'Chỉ nét' },
        { value: 'rotate', label: 'Xoay 90°' },
        { value: 'flip', label: 'Lật' },
        { value: 'scale', label: 'Co giãn' },
      ],
      compact: true,
      show: isShape,
    }),
    segmented(store, {
      label: 'Chiều dịch chữ',
      path: 'text.slide',
      options: [
        { value: 'alternate', label: 'Xen kẽ' },
        { value: 'same', label: 'Cùng chiều' },
        { value: 'none', label: 'Đứng yên' },
      ],
      show: isText,
    }),
  );

  const grid = sec(
    '04',
    'Độ dày đặc',
    'Density & Spacing',
    // shape
    slider(store, { label: 'Số cột', path: 'shape.cols', min: 1, max: 14, step: 1, show: isShape }),
    slider(store, { label: 'Số hàng', path: 'shape.rows', min: 1, max: 14, step: 1, show: isShape }),
    slider(store, { label: 'Khoảng cách lưới', path: 'shape.gap', min: 0, max: 0.6, step: 0.01, fmt: pct, show: isShape }),
    slider(store, { label: 'Lề khung', path: 'shape.margin', min: 0, max: 0.2, step: 0.005, fmt: pct, show: isShape }),
    // text
    slider(store, { label: 'Số dòng chữ', path: 'text.rows', min: 1, max: 20, step: 1, show: isText }),
    slider(store, { label: 'Lặp ngang mỗi dòng', path: 'text.repeat', min: 1, max: 6, step: 1, fmt: times, show: isText }),
    slider(store, { label: 'Khoảng cách dòng', path: 'text.gap', min: 0, max: 0.6, step: 0.01, fmt: pct, show: isText }),
    slider(store, { label: 'Lề khung', path: 'text.margin', min: 0, max: 0.2, step: 0.005, fmt: pct, show: isText }),
    // wide → narrow
    slider(store, { label: 'Số cột', path: 'wide.cols', min: 2, max: 24, step: 1, show: isWide }),
    slider(store, { label: 'Số hàng', path: 'wide.rows', min: 1, max: 10, step: 1, show: isWide }),
    slider(store, { label: 'Khoảng cách lưới', path: 'wide.gap', min: 0, max: 0.4, step: 0.005, fmt: pct, show: isWide }),
    slider(store, { label: 'Lề khung', path: 'wide.margin', min: 0, max: 0.2, step: 0.005, fmt: pct, show: isWide }),
  );

  const weight = sec(
    '05',
    'Trọng lượng nét',
    'Thin → Black',
    weightRange(store),
    toggle(store, { label: 'Đảo chiều', path: 'weight.invert', hint: 'Black → Thin' }),
    toggle(store, { label: 'Gắn nét với độ rộng', path: 'wide.linkWeight', hint: 'Cột hẹp mảnh, cột rộng đậm', show: isWide }),
  );

  const variants = sec(
    '06',
    'Biến thể',
    'Theo từng pattern',
    segmented(store, {
      label: 'Cách xếp asset',
      path: 'shape.arrange',
      options: [
        { value: 'cycle', label: 'Xoay vòng' },
        { value: 'random', label: 'Ngẫu nhiên' },
      ],
      show: isShape,
    }),
    slider(store, { label: 'Dư ảnh (echo)', path: 'text.echo', min: 0, max: 4, step: 1, show: isText, hint: 'Các lớp màu nối đuôi chuyển động' }),
    slider(store, { label: 'Quãng dịch chuyển', path: 'text.shift', min: 0, max: 3, step: 0.25, fmt: (v) => `${v} ô`, show: isText, hint: 'Số lần lặp chữ mà mỗi dòng trượt qua' }),
    slider(store, { label: 'Tỉ lệ hẹp : rộng', path: 'wide.ratio', min: 1, max: 14, step: 0.5, fmt: (v) => `1 : ${v}`, show: isWide }),
    toggle(store, { label: 'Nền đặc cho từng ô', path: 'wide.block', hint: 'Chữ khoét trên khối màu', show: isWide }),
  );

  const left = [content, colors];
  const right = [rhythm, grid, weight, variants];
  return { left, right };
}
