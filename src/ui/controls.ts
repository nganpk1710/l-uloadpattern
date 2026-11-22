import { EASINGS, EASING_LABELS, type EasingId } from '../core/easing';
import { BRAND_COLORS, COLOR_PRESETS } from '../core/color';
import { getPath, type State, type Store } from '../core/state';
import { h, html } from './dom';

/** A control owns its DOM, knows how to reflect the store (sync) and when it should be visible. */
export interface Ctl {
  el: HTMLElement;
  sync(s: State): void;
}

export interface Base {
  show?: (s: State) => boolean;
}

const wrap = (el: HTMLElement, o: Base, sync: (s: State) => void): Ctl => ({
  el,
  sync(s) {
    if (o.show) el.hidden = !o.show(s);
    sync(s);
  },
});

const setFill = (input: HTMLInputElement) => {
  const min = +input.min;
  const max = +input.max;
  input.style.setProperty('--p', `${((+input.value - min) / (max - min)) * 100}%`);
};

/* ------------------------------------------------------------------ slider */
export function slider(
  store: Store,
  o: Base & { label: string; path: string; min: number; max: number; step: number; fmt?: (v: number) => string; hint?: string },
): Ctl {
  const fmt = o.fmt ?? ((v: number) => String(v));
  const out = h('output', { class: 'ctl__value' });
  const input = h('input', { class: 'rng', type: 'range', min: o.min, max: o.max, step: o.step, 'aria-label': o.label });
  input.addEventListener('input', () => store.set(o.path, +input.value));
  const el = h(
    'label',
    { class: 'ctl' },
    h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, o.label), out),
    input,
    o.hint ? h('span', { class: 'ctl__hint' }, o.hint) : null,
  );
  return wrap(el, o, (s) => {
    const v = getPath(s, o.path) as number;
    if (+input.value !== v) input.value = String(v);
    out.textContent = fmt(v);
    setFill(input);
  });
}

/* --------------------------------------------------------------- segmented */
export interface Option<V> {
  value: V;
  label: string;
  title?: string;
  icon?: Element;
}

export function segmented<V extends string | number>(
  store: Store,
  o: Base & { label?: string; path: string; options: Option<V>[]; compact?: boolean; hint?: string },
): Ctl {
  const buttons = o.options.map((opt) =>
    h(
      'button',
      { type: 'button', class: 'chip', title: opt.title ?? opt.label, 'aria-pressed': 'false', onclick: () => store.set(o.path, opt.value) },
      opt.icon,
      opt.label ? h('span', {}, opt.label) : null,
    ),
  );
  const el = h(
    'div',
    { class: 'ctl' },
    o.label ? h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, o.label)) : null,
    h('div', { class: `seg${o.compact ? ' seg--compact' : ''}`, role: 'group', 'aria-label': o.label ?? '' }, ...buttons),
    o.hint ? h('span', { class: 'ctl__hint' }, o.hint) : null,
  );
  return wrap(el, o, (s) => {
    const v = getPath(s, o.path);
    o.options.forEach((opt, i) => buttons[i].setAttribute('aria-pressed', String(opt.value === v)));
  });
}

/* ------------------------------------------------------------------ toggle */
export function toggle(store: Store, o: Base & { label: string; path: string; hint?: string }): Ctl {
  const input = h('input', { type: 'checkbox', class: 'switch__input' });
  input.addEventListener('change', () => store.set(o.path, input.checked));
  const el = h(
    'label',
    { class: 'ctl ctl--switch' },
    h('span', { class: 'switch' }, input, h('span', { class: 'switch__box' })),
    h('span', { class: 'switch__text' }, h('span', { class: 'ctl__label' }, o.label), o.hint ? h('span', { class: 'ctl__hint' }, o.hint) : null),
  );
  return wrap(el, o, (s) => {
    input.checked = !!getPath(s, o.path);
  });
}

/* -------------------------------------------------------------- text field */
export function textField(
  store: Store,
  o: Base & { label: string; path: string; placeholder?: string; maxLength?: number; chips?: string[]; hint?: string },
): Ctl {
  const input = h('input', { class: 'field', type: 'text', placeholder: o.placeholder ?? '', maxlength: o.maxLength ?? 40, spellcheck: false, autocomplete: 'off', 'aria-label': o.label });
  input.addEventListener('input', () => store.set(o.path, input.value));
  const chips = (o.chips ?? []).map((c) =>
    h('button', { type: 'button', class: 'chip chip--ghost', onclick: () => store.set(o.path, c) }, c),
  );
  const el = h(
    'div',
    { class: 'ctl' },
    h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, o.label)),
    input,
    chips.length ? h('div', { class: 'seg seg--compact' }, ...chips) : null,
    o.hint ? h('span', { class: 'ctl__hint' }, o.hint) : null,
  );
  return wrap(el, o, (s) => {
    const v = getPath(s, o.path) as string;
    if (input.value !== v) input.value = v;
  });
}

/* ------------------------------------------------------------ weight range */
const WEIGHT_NAMES: [number, string][] = [
  [100, 'Thin'],
  [200, 'ExtraLight'],
  [300, 'Light'],
  [400, 'Regular'],
  [500, 'Medium'],
  [600, 'SemiBold'],
  [700, 'Bold'],
  [800, 'ExtraBold'],
  [900, 'Black'],
];
const weightName = (w: number) => WEIGHT_NAMES.reduce((a, b) => (Math.abs(b[0] - w) < Math.abs(a[0] - w) ? b : a))[1];

const WEIGHT_PRESETS: { label: string; min: number; max: number }[] = [
  { label: 'Thin → Black', min: 100, max: 900 },
  { label: 'Light → Bold', min: 300, max: 700 },
  { label: 'Medium → Black', min: 500, max: 900 },
  { label: 'Thin → Regular', min: 100, max: 400 },
];

export function weightRange(store: Store, o: Base = {}): Ctl {
  const lo = h('input', { class: 'dual__in dual__in--lo', type: 'range', min: 100, max: 900, step: 10, 'aria-label': 'Trọng lượng nhỏ nhất' });
  const hi = h('input', { class: 'dual__in dual__in--hi', type: 'range', min: 100, max: 900, step: 10, 'aria-label': 'Trọng lượng lớn nhất' });
  const fill = h('span', { class: 'dual__fill' });
  const loOut = h('span', { class: 'weight__num' });
  const hiOut = h('span', { class: 'weight__num' });
  const loName = h('span', { class: 'weight__name' });
  const hiName = h('span', { class: 'weight__name' });
  const sampleLo = h('span', { class: 'weight__sample' }, 'Aa');
  const sampleHi = h('span', { class: 'weight__sample' }, 'Aa');

  lo.addEventListener('input', () => store.set('weight.min', Math.min(+lo.value, +hi.value)));
  hi.addEventListener('input', () => store.set('weight.max', Math.max(+hi.value, +lo.value)));

  const presets = WEIGHT_PRESETS.map((p) =>
    h('button', {
      type: 'button',
      class: 'chip chip--ghost',
      onclick: () => store.patch((s) => ((s.weight.min = p.min), (s.weight.max = p.max))),
    }, p.label),
  );

  const el = h(
    'div',
    { class: 'ctl weight' },
    h(
      'div',
      { class: 'weight__readout' },
      h('div', { class: 'weight__end' }, sampleLo, h('div', {}, loOut, loName)),
      h('div', { class: 'weight__end weight__end--r' }, h('div', {}, hiOut, hiName), sampleHi),
    ),
    h('div', { class: 'dual' }, h('span', { class: 'dual__track' }), fill, lo, hi),
    h('div', { class: 'seg seg--compact' }, ...presets),
  );

  return wrap(el, o, (s) => {
    const { min, max } = s.weight;
    lo.value = String(min);
    hi.value = String(max);
    const pct = (v: number) => ((v - 100) / 800) * 100;
    fill.style.left = `${pct(min)}%`;
    fill.style.width = `${pct(max) - pct(min)}%`;
    // keep the thumb that is not at the extreme reachable when both overlap
    lo.style.zIndex = min >= 800 ? '3' : '2';
    loOut.textContent = String(min);
    hiOut.textContent = String(max);
    loName.textContent = weightName(min);
    hiName.textContent = weightName(max);
    sampleLo.style.fontWeight = String(min);
    sampleHi.style.fontWeight = String(max);
  });
}

/* ------------------------------------------------------------ easing chips */
function easingIcon(id: EasingId) {
  const f = EASINGS[id];
  const pts: string[] = [];
  const N = 28;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = Math.max(-0.2, Math.min(1.2, f(t)));
    pts.push(`${(2 + t * 24).toFixed(1)},${(26 - (y + 0.0) * 22).toFixed(1)}`);
  }
  return html<SVGElement>(
    `<svg class="ease-icon" viewBox="0 0 28 28" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  );
}

export const EASING_OPTIONS: Option<EasingId>[] = (Object.keys(EASINGS) as EasingId[]).map((id) => ({
  value: id,
  label: EASING_LABELS[id],
  icon: easingIcon(id),
}));

/* ----------------------------------------------------------------- colours */
export function colorPresets(store: Store, o: Base = {}): Ctl {
  const cards = COLOR_PRESETS.map((p) =>
    h(
      'button',
      {
        type: 'button',
        class: 'preset',
        title: p.name,
        'aria-label': `Bộ màu ${p.name}`,
        style: `--bg:${p.bg}`,
        onclick: () =>
          store.patch((s) => {
            s.color.bg = p.bg;
            s.color.fg = [...p.fg];
          }),
      },
      h('span', { class: 'preset__dots' }, ...p.fg.slice(0, 4).map((c) => h('i', { style: `background:${c}` }))),
    ),
  );
  const el = h('div', { class: 'ctl' }, h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, 'Bộ màu nhanh')), h('div', { class: 'presets' }, ...cards));
  return wrap(el, o, (s) => {
    COLOR_PRESETS.forEach((p, i) => {
      const on = p.bg === s.color.bg && p.fg.length === s.color.fg.length && p.fg.every((c, k) => c === s.color.fg[k]);
      cards[i].setAttribute('aria-pressed', String(on));
    });
  });
}

export function swatches(store: Store, o: Base & { label: string; kind: 'bg' | 'fg' }): Ctl {
  const badges: HTMLElement[] = [];
  const buttons = BRAND_COLORS.map((c) => {
    const badge = h('span', { class: 'swatch__n' });
    badges.push(badge);
    return h(
      'button',
      {
        type: 'button',
        class: `swatch${c.hex === '#fdfdfd' ? ' swatch--light' : ''}`,
        title: `${c.name} ${c.hex.toUpperCase()}`,
        'aria-label': `${c.name} ${c.hex}`,
        'aria-pressed': 'false',
        style: `--c:${c.hex}`,
        onclick: () =>
          store.patch((s) => {
            if (o.kind === 'bg') {
              s.color.bg = c.hex;
              return;
            }
            const i = s.color.fg.indexOf(c.hex);
            if (i >= 0) {
              if (s.color.fg.length > 1) s.color.fg.splice(i, 1);
            } else s.color.fg.push(c.hex);
          }),
      },
      badge,
    );
  });
  const el = h(
    'div',
    { class: 'ctl' },
    h('span', { class: 'ctl__row' }, h('span', { class: 'ctl__label' }, o.label)),
    h('div', { class: 'swatches' }, ...buttons),
    o.kind === 'fg' ? h('span', { class: 'ctl__hint' }, 'Chọn nhiều màu · số thứ tự là vòng lặp màu') : null,
  );
  return wrap(el, o, (s) => {
    BRAND_COLORS.forEach((c, i) => {
      if (o.kind === 'bg') {
        buttons[i].setAttribute('aria-pressed', String(s.color.bg === c.hex));
        badges[i].textContent = '';
      } else {
        const idx = s.color.fg.indexOf(c.hex);
        buttons[i].setAttribute('aria-pressed', String(idx >= 0));
        badges[i].textContent = idx >= 0 ? String(idx + 1) : '';
      }
    });
  });
}
