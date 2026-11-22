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

const px = (v: number) => `${Math.round(v)}px`;
const signed = (v: number) => (v > 0 ? '+' : '') + pct(v);

export function buildPanels(store: Store, lib: AssetLibrary) {
  const isShape = (s: State) => s.pattern === 'shape';
  const isText = (s: State) => s.pattern === 'text';
  /** Loop = repeated background that travels one way. Thin → Black = the weight morph. Never shown together. */
  const isLoop = (s: State) => (isShape(s) && s.shape.layout === 'tile') || (isText(s) && s.text.mode === 'loop');
  const isMorph = (s: State) => !isLoop(s);
  const isTile = (s: State) => isShape(s) && s.shape.layout === 'tile';
  const isLoose = (s: State) => isShape(s) && s.shape.layout === 'loose';
  const isTextLoop = (s: State) => isText(s) && s.text.mode === 'loop';
  const isTextMorph = (s: State) => isText(s) && s.text.mode === 'weight';
  const travels = (s: State) => isTile(s) && ['scroll', 'rows', 'cols'].includes(s.shape.tileMotion);
  const brick = (s: State) => isTile(s) && (s.shape.tileType === 'brickRow' || s.shape.tileType === 'brickCol');

  /* ───────────── LEFT · Nội dung, Type & Màu ───────────── */
  const content = sec('01', 'Nội dung', 'Assets đầu vào', assetPanel(store, lib, { show: isShape }));

  const type = sec(
    '02',
    'Type',
    'Chữ · Big Shoulders',
    textField(store, {
      label: 'Dòng chữ',
      path: 'text.content',
      placeholder: 'LƯU LOAD',
      maxLength: 24,
      chips: ['LƯU LOAD', 'NẠP LẠI', 'CÀ PHÊ VỈA HÈ'],
      hint: 'Hỗ trợ đủ dấu tiếng Việt',
      show: isText,
    }),
    toggle(store, { label: 'Viết hoa', path: 'text.upper', show: isText }),
    slider(store, { label: 'Trọng lượng chữ', path: 'text.weight', min: 100, max: 900, step: 10, fmt: (v) => String(v), hint: '100 Thin → 900 Black · cố định trong chế độ Loop', show: isTextLoop }),
    slider(store, { label: 'Giãn chữ', path: 'text.tracking', min: -0.1, max: 0.5, step: 0.005, fmt: (v) => `${Math.round(v * 1000) / 10}%`, show: isText }),
    slider(store, { label: 'Khoảng cách giữa các chữ lặp', path: 'text.wordGap', min: 0, max: 1.5, step: 0.05, fmt: pct, show: isText }),
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
    '03',
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
  const mode = sec(
    '04',
    'Chế độ',
    'Loop ⟷ Thin → Black',
    segmented(store, {
      label: 'Chuyển động',
      path: 'text.mode',
      options: [
        { value: 'loop', label: 'Loop · nền lặp', title: 'Nền chữ lặp chạy xuyên suốt một chiều' },
        { value: 'weight', label: 'Thin → Black', title: 'Nét chữ chuyển từ mảnh đến đậm' },
      ],
      show: isText,
    }),
    segmented(store, {
      label: 'Chuyển động',
      path: 'shape.layout',
      options: [
        { value: 'tile', label: 'Loop · nền lặp', title: 'Shape lặp thành nền, chạy xuyên suốt' },
        { value: 'loose', label: 'Thin → Black', title: 'Lưới shape, nét chuyển từ mảnh đến đậm' },
      ],
      show: isShape,
    }),
  );

  const rhythm = sec(
    '05',
    'Nhịp điệu',
    'Rhythm & Easing',
    slider(store, { label: 'Thời lượng 1 vòng loop', path: 'rhythm.duration', min: 0.8, max: 12, step: 0.1, fmt: sec_s }),
    segmented(store, { label: 'Easing', path: 'rhythm.easing', options: EASING_OPTIONS, compact: true, show: (s) => isMorph(s) || (isTile(s) && ['flip', 'rotate'].includes(s.shape.tileMotion)) }),
    segmented(store, {
      label: 'Kiểu lặp',
      path: 'rhythm.loop',
      options: [
        { value: 'pingpong', label: 'Mượt · đi & về', title: 'Thin → Black → Thin, liền mạch' },
        { value: 'load', label: 'Nạp · reset', title: 'Nạp đầy rồi quay lại đầu như thanh loading' },
      ],
      show: isMorph,
    }),
    slider(store, { label: 'Độ lan sóng', path: 'rhythm.stagger', min: -1, max: 1, step: 0.01, fmt: signed, hint: '0% = cả khung chuyển động cùng lúc · âm = đảo hướng', show: (s) => isMorph(s) || (isTile(s) && ['flip', 'rotate'].includes(s.shape.tileMotion)) }),
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
      show: (s) => isMorph(s) || (isTile(s) && ['flip', 'rotate'].includes(s.shape.tileMotion)),
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
  );

  const arrows = [
    { value: 'ul', label: '↖' }, { value: 'u', label: '↑' }, { value: 'ur', label: '↗' },
    { value: 'l', label: '←' }, { value: 'r', label: '→' },
    { value: 'dl', label: '↙' }, { value: 'd', label: '↓' }, { value: 'dr', label: '↘' },
  ];

  const loop = sec(
    '06',
    'Loop',
    'Nền lặp chạy xuyên suốt',
    // shape
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
    segmented(store, { label: 'Hướng chạy', path: 'shape.dir', options: arrows, compact: true, show: travels }),
    slider(store, { label: 'Số vòng mỗi loop', path: 'shape.laps', min: 1, max: 4, step: 1, fmt: times, hint: 'Mỗi vòng chạy đúng 1 chu kỳ lưới nên luôn khớp đầu–cuối', show: travels }),
    // text
    segmented(store, {
      label: 'Hướng chạy',
      path: 'text.dir',
      options: [
        { value: 'l', label: '← Ngang trái' },
        { value: 'r', label: 'Ngang phải →' },
        { value: 'u', label: '↑ Dọc lên' },
        { value: 'd', label: 'Dọc xuống ↓' },
      ],
      compact: true,
      show: isTextLoop,
    }),
    toggle(store, { label: 'Xen kẽ ngược chiều', path: 'text.alt', hint: 'Dòng (hoặc cột) liền kề chạy ngược nhau', show: isTextLoop }),
    slider(store, { label: 'Số vòng mỗi loop', path: 'text.laps', min: 1, max: 4, step: 1, fmt: times, hint: 'Mỗi vòng = chạy đúng 1 ô chữ (ngang) hoặc 1 chu kỳ màu (dọc)', show: isTextLoop }),
  );

  const grid = sec(
    '07',
    'Lưới & Tile',
    'Density & Spacing',
    // shape — Loop · tile type
    segmented(store, {
      label: 'Tile type',
      path: 'shape.tileType',
      options: [
        { value: 'grid', label: 'Grid' },
        { value: 'brickRow', label: 'Brick by Row' },
        { value: 'brickCol', label: 'Brick by Column' },
        { value: 'hexCol', label: 'Hex by Column' },
        { value: 'hexRow', label: 'Hex by Row' },
      ],
      compact: true,
      show: isTile,
    }),
    slider(store, { label: 'Brick offset', path: 'shape.brickOffset', min: 0, max: 1, step: 0.05, fmt: pct, show: brick }),
    segmented(store, {
      label: 'Kích thước ô nhanh',
      path: 'shape.tileW',
      options: [1080, 540, 360, 270, 180, 135].map((v) => ({ value: v, label: `${1080 / v}×${1080 / v}` })),
      compact: true,
      show: isTile,
    }),
    slider(store, { label: 'Width', path: 'shape.tileW', min: 90, max: 1080, step: 5, fmt: px, show: isTile }),
    slider(store, { label: 'Height', path: 'shape.tileH', min: 90, max: 1080, step: 5, fmt: px, show: (s) => isTile(s) && !s.shape.tileLock }),
    toggle(store, { label: 'Khóa tỉ lệ Width = Height', path: 'shape.tileLock', show: isTile }),
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
    slider(store, { label: 'Khoảng cách lưới', path: 'shape.tileGap', min: -0.6, max: 0.4, step: 0.005, fmt: signed, hint: 'Âm = shape lớn hơn ô, chồng khít vào nhau', show: isTile }),
    toggle(store, { label: 'Đảo sáng / tối', path: 'shape.invert', hint: 'Đổi màu hình và nền', show: isTile }),
    toggle(store, { label: 'Nhiều màu cho hình', path: 'shape.multi', hint: 'Mỗi shape lấy 1 màu trong bảng màu', show: isTile }),
    // shape — Thin → Black grid
    slider(store, { label: 'Số cột', path: 'shape.cols', min: 1, max: 14, step: 1, show: isLoose }),
    slider(store, { label: 'Số hàng', path: 'shape.rows', min: 1, max: 14, step: 1, show: isLoose }),
    slider(store, { label: 'Khoảng cách lưới', path: 'shape.gap', min: 0, max: 0.6, step: 0.01, fmt: pct, show: isLoose }),
    slider(store, { label: 'Lề khung', path: 'shape.margin', min: 0, max: 0.2, step: 0.005, fmt: pct, show: isLoose }),
    // text
    slider(store, { label: 'Số dòng chữ', path: 'text.rows', min: 1, max: 20, step: 1, show: isText }),
    slider(store, { label: 'Lặp ngang mỗi dòng', path: 'text.repeat', min: 1, max: 6, step: 1, fmt: times, show: isText }),
    slider(store, { label: 'Khoảng cách dòng', path: 'text.gap', min: -0.2, max: 0.6, step: 0.01, fmt: signed, show: isText }),
    slider(store, { label: 'Lề khung', path: 'text.margin', min: 0, max: 0.2, step: 0.005, fmt: pct, show: isText }),
  );

  const weight = sec(
    '08',
    'Trọng lượng nét',
    'Thin → Black',
    weightRange(store, { show: isMorph }),
    toggle(store, { label: 'Đảo chiều', path: 'weight.invert', hint: 'Black → Thin', show: isMorph }),
  );

  const variants = sec(
    '09',
    'Biến thể',
    'Thin → Black',
    segmented(store, {
      label: 'Cách xếp asset',
      path: 'shape.arrange',
      options: [
        { value: 'cycle', label: 'Xoay vòng' },
        { value: 'random', label: 'Ngẫu nhiên' },
      ],
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
      show: isTextMorph,
    }),
    slider(store, { label: 'Quãng dịch chuyển', path: 'text.shift', min: 0, max: 3, step: 0.25, fmt: (v) => `${v} ô`, show: isTextMorph, hint: 'Số lần lặp chữ mà mỗi dòng trượt qua' }),
    slider(store, { label: 'Số lớp chữ màu', path: 'text.echo', min: 0, max: 4, step: 1, show: isTextMorph, hint: 'Lớp sau (đỏ, vàng…) nằm sau lớp trước, mỗi lớp lấy 1 màu trong bảng màu' }),
    slider(store, { label: 'Biên độ lớp chữ', path: 'text.spread', min: 0, max: 1, step: 0.01, fmt: pct, show: isTextMorph, hint: 'Các lớp sau trượt trái ↔ phải bao xa (theo % 1 ô chữ)' }),
  );

  const left = [content, type, colors];
  const right = [mode, rhythm, loop, grid, weight, variants];
  return { left, right };
}
