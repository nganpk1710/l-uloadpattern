import type { AssetLibrary } from '../core/assets';
import { randomPalette } from '../core/color';
import type { State, Store } from '../core/state';
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
  const isTile = (s: State) => s.pattern === 'shape' && s.shape.layout === 'tile';
  const isLoose = (s: State) => s.pattern === 'shape' && s.shape.layout === 'loose';
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
      show: isLoose,
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

  const loop = sec(
    '04',
    'Seamless Loop',
    'Shape chạy liền mạch',
    segmented(store, {
      label: 'Kiểu chạy',
      path: 'shape.tileMotion',
      options: [
        { value: 'scroll', label: 'Cả lưới' },
        { value: 'rows', label: 'Hàng xen kẽ' },
        { value: 'cols', label: 'Cột xen kẽ' },
        { value: 'flip', label: 'Lật' },
        { value: 'rotate', label: 'Xoay' },
        { value: 'still', label: 'Đứng yên' },
      ],
      compact: true,
      show: isTile,
    }),
    segmented(store, {
      label: 'Hướng chạy',
      path: 'shape.dir',
      options: [
        { value: 'ul', label: '↖' }, { value: 'u', label: '↑' }, { value: 'ur', label: '↗' },
        { value: 'l', label: '←' }, { value: 'r', label: '→' },
        { value: 'dl', label: '↙' }, { value: 'd', label: '↓' }, { value: 'dr', label: '↘' },
      ],
      compact: true,
      show: (s) => isTile(s) && (s.shape.tileMotion === 'scroll' || s.shape.tileMotion === 'rows' || s.shape.tileMotion === 'cols'),
    }),
    slider(store, {
      label: 'Số vòng mỗi loop',
      path: 'shape.laps',
      min: 1,
      max: 4,
      step: 1,
      fmt: times,
      hint: 'Mỗi vòng = chạy đúng 1 chu kỳ lưới nên luôn khớp đầu–cuối. Tăng để chạy nhanh hơn mà không phải rút ngắn thời lượng',
      show: (s) => isTile(s) && ['scroll', 'rows', 'cols'].includes(s.shape.tileMotion),
    }),
  );

  const grid = sec(
    '05',
    'Độ dày đặc',
    'Density & Spacing',
    // shape — seamless tiles
    segmented(store, {
      label: 'Bố cục',
      path: 'shape.layout',
      options: [
        { value: 'tile', label: 'Tile liền khít' },
        { value: 'loose', label: 'Lưới rời' },
      ],
      show: isShape,
    }),
    segmented(store, {
      label: 'Lưới tile',
      path: 'shape.tiles',
      options: [1, 2, 3, 4, 5, 6, 8].map((n) => ({ value: n, label: `${n}×${n}` })),
      compact: true,
      show: isTile,
    }),
    segmented(store, {
      label: 'Quy tắc xoay / lật',
      path: 'shape.rule',
      options: [
        { value: 'same', label: 'Giữ nguyên' },
        { value: 'mirror', label: 'Đối xứng' },
        { value: 'checker', label: 'Cờ vua' },
        { value: 'pinwheel', label: 'Chong chóng' },
        { value: 'spin', label: 'Xoay vòng' },
        { value: 'turns', label: 'Xoay ngẫu nhiên' },
        { value: 'random', label: 'Xoay + lật ngẫu nhiên' },
      ],
      compact: true,
      show: isTile,
    }),
    slider(store, { label: 'Khoảng cách lưới', path: 'shape.tileGap', min: -0.6, max: 0.4, step: 0.005, fmt: (v) => (v > 0 ? '+' : '') + pct(v), hint: 'Âm = shape lớn hơn ô, chồng khít vào nhau', show: isTile }),
    slider(store, { label: 'Lệch hàng (brick)', path: 'shape.brick', min: 0, max: 0.5, step: 0.25, fmt: pct, show: isTile }),
    toggle(store, { label: 'Đảo sáng / tối', path: 'shape.invert', hint: 'Đổi màu hình và nền', show: isTile }),
    toggle(store, { label: 'Nhiều màu cho hình', path: 'shape.multi', hint: 'Mỗi shape lấy 1 màu trong bảng màu', show: isTile }),
    // shape — loose grid
    slider(store, { label: 'Số cột', path: 'shape.cols', min: 1, max: 14, step: 1, show: isLoose }),
    slider(store, { label: 'Số hàng', path: 'shape.rows', min: 1, max: 14, step: 1, show: isLoose }),
    slider(store, { label: 'Khoảng cách lưới', path: 'shape.gap', min: 0, max: 0.6, step: 0.01, fmt: pct, show: isLoose }),
    slider(store, { label: 'Lề khung', path: 'shape.margin', min: 0, max: 0.2, step: 0.005, fmt: pct, show: isLoose }),
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
    '06',
    'Trọng lượng nét',
    'Thin → Black · chữ',
    weightRange(store, { show: (s) => !isTile(s) }),
    toggle(store, { label: 'Đảo chiều', path: 'weight.invert', hint: 'Black → Thin', show: (s) => !isTile(s) }),
    toggle(store, { label: 'Gắn nét với độ rộng', path: 'wide.linkWeight', hint: 'Cột hẹp mảnh, cột rộng đậm', show: isWide }),
  );

  const variants = sec(
    '07',
    'Biến thể',
    'Theo từng pattern',
    segmented(store, {
      label: 'Cách xếp asset',
      path: 'shape.arrange',
      options: [
        { value: 'cycle', label: 'Xoay vòng' },
        { value: 'random', label: 'Ngẫu nhiên' },
      ],
      show: isLoose,
    }),
    slider(store, { label: 'Số lớp chữ màu', path: 'text.echo', min: 0, max: 4, step: 1, show: isText, hint: 'Lớp sau (đỏ, vàng…) nằm sau lớp trước, mỗi lớp lấy 1 màu trong bảng màu' }),
    slider(store, { label: 'Biên độ lớp chữ', path: 'text.spread', min: 0, max: 1, step: 0.01, fmt: pct, show: isText, hint: 'Các lớp sau trượt trái ↔ phải bao xa (theo % 1 ô chữ)' }),
    slider(store, { label: 'Quãng dịch chuyển', path: 'text.shift', min: 0, max: 3, step: 0.25, fmt: (v) => `${v} ô`, show: isText, hint: 'Số lần lặp chữ mà mỗi dòng trượt qua' }),
    slider(store, { label: 'Tỉ lệ hẹp : rộng', path: 'wide.ratio', min: 1, max: 14, step: 0.5, fmt: (v) => `1 : ${v}`, show: isWide }),
    toggle(store, { label: 'Nền đặc cho từng ô', path: 'wide.block', hint: 'Chữ khoét trên khối màu', show: isWide }),
  );

  const left = [content, colors];
  const right = [rhythm, loop, grid, weight, variants];
  return { left, right };
}
