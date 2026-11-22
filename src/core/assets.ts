import type { Mat } from './math';
import { IDENTITY } from './math';
import { luminance } from './color';

export interface ShapePath {
  d: string;
  matrix: Mat;
  /** original fill colour from the SVG, null = could not resolve */
  fill: string | null;
  evenodd: boolean;
}

export interface ShapeAsset {
  id: string;
  name: string;
  vb: { x: number; y: number; w: number; h: number };
  paths: ShapePath[];
  /** bounding box of the visible artwork (clamped to the viewBox) — what tiles and grids fit to */
  bbox: { x: number; y: number; w: number; h: number };
  /** true when the artwork mixes light and dark fills (a full tile with its own background) */
  twoTone: boolean;
  builtin: boolean;
  /** original SVG markup (used to persist uploads) */
  source: string;
}

/* ----------------------------------------------------------------------------------------------
 * Built-in library — every file in src/assets/shapes is picked up automatically.
 * Add a new .svg there (and optionally a label below) and it shows up in the Assets panel.
 * ------------------------------------------------------------------------------------------- */
const rawShapes = import.meta.glob('../assets/shapes/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const LABELS: Record<string, string> = {
  'chatbox-02': 'Hộp thoại 02',
  'pattern-01': 'Pattern LƯU LOAD 01',
  frame: 'Khung vòm',
  loa: 'Loa',
  chatbox: 'Hộp thoại',
  'chatbox-mirror': 'Hộp thoại đối xứng',
  'arrow-bold': 'Mũi tên đậm',
  'arrow-space': 'Mũi tên lưới',
  line: 'Đường nét',
  text: 'Chữ LOAD',
};
const ORDER = ['chatbox-02', 'pattern-01', 'frame', 'loa', 'chatbox', 'chatbox-mirror', 'arrow-bold', 'arrow-space', 'line', 'text'];

const SKIP_TAGS = new Set(['defs', 'clippath', 'mask', 'symbol', 'style', 'title', 'desc', 'metadata', 'image', 'text', 'use', 'pattern', 'lineargradient', 'radialgradient', 'filter']);

function parseStyleClasses(doc: Document, clips: Record<string, string>): Record<string, string> {
  const map: Record<string, string> = {};
  doc.querySelectorAll('style').forEach((s) => {
    const css = s.textContent || '';
    for (const m of css.matchAll(/\.([\w-]+)\s*\{([^}]*)\}/g)) {
      const fill = /fill\s*:\s*([^;]+)/.exec(m[2]);
      if (fill) map[m[1]] = fill[1].trim();
      const clip = /clip-path\s*:\s*url\(#([^)]+)\)/.exec(m[2]);
      if (clip) clips[m[1]] = clip[1];
    }
  });
  return map;
}

function normaliseColor(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim().toLowerCase();
  if (s === 'none' || s === 'transparent') return 'none';
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return '#' + [...s.slice(1)].map((c) => c + c).join('');
  const rgb = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/.exec(s);
  if (rgb) return '#' + [rgb[1], rgb[2], rgb[3]].map((n) => (+n).toString(16).padStart(2, '0')).join('');
  if (s === 'white') return '#ffffff';
  if (s === 'black') return '#000000';
  return null; // gradients, currentColor, named colours — resolved by caller
}

const num = (el: Element, name: string, def = 0) => {
  const v = parseFloat(el.getAttribute(name) || '');
  return Number.isFinite(v) ? v : def;
};

function primitiveToPath(el: Element): string | null {
  switch (el.tagName.toLowerCase()) {
    case 'path':
      return el.getAttribute('d');
    case 'rect': {
      const x = num(el, 'x');
      const y = num(el, 'y');
      const w = num(el, 'width');
      const h = num(el, 'height');
      let rx = num(el, 'rx', num(el, 'ry'));
      let ry = num(el, 'ry', rx);
      rx = Math.min(rx, w / 2);
      ry = Math.min(ry, h / 2);
      if (!w || !h) return null;
      if (!rx && !ry) return `M${x} ${y}h${w}v${h}h${-w}Z`;
      return `M${x + rx} ${y}h${w - 2 * rx}a${rx} ${ry} 0 0 1 ${rx} ${ry}v${h - 2 * ry}a${rx} ${ry} 0 0 1 ${-rx} ${ry}h${-(w - 2 * rx)}a${rx} ${ry} 0 0 1 ${-rx} ${-ry}v${-(h - 2 * ry)}a${rx} ${ry} 0 0 1 ${rx} ${-ry}Z`;
    }
    case 'circle': {
      const cx = num(el, 'cx');
      const cy = num(el, 'cy');
      const r = num(el, 'r');
      return r ? `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z` : null;
    }
    case 'ellipse': {
      const cx = num(el, 'cx');
      const cy = num(el, 'cy');
      const rx = num(el, 'rx');
      const ry = num(el, 'ry');
      return rx && ry ? `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z` : null;
    }
    case 'polygon':
    case 'polyline': {
      const pts = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number);
      if (pts.length < 6 || pts.some((n) => !Number.isFinite(n))) return null;
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return d + 'Z';
    }
    default:
      return null;
  }
}

/** Parse SVG markup into a flat list of filled paths + viewBox. Returns null when nothing drawable is found. */
export function parseSvg(source: string, id: string, name: string, builtin = false): ShapeAsset | null {
  const doc = new DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = doc.documentElement;
  if (!svg || svg.tagName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) return null;

  let vb = svg.getAttribute('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (!vb || vb.length !== 4 || vb.some((n) => !Number.isFinite(n)) || vb[2] <= 0 || vb[3] <= 0) {
    const w = parseFloat(svg.getAttribute('width') || '') || 100;
    const h = parseFloat(svg.getAttribute('height') || '') || 100;
    vb = [0, 0, w, h];
  }
  const clipClasses: Record<string, string> = {};
  const classes = parseStyleClasses(doc, clipClasses);
  const paths: ShapePath[] = [];

  /** A group clipped to a rectangle that lies entirely outside the artboard draws nothing. */
  const clippedAway = (el: Element): boolean => {
    const attr = /url\(#([^)]+)\)/.exec(el.getAttribute('clip-path') || '')?.[1];
    const cls = (el.getAttribute('class') || '').split(/\s+/).map((c) => clipClasses[c]).find(Boolean);
    const id = attr ?? cls;
    if (!id) return false;
    const rect = doc.getElementById(id)?.querySelector('rect');
    if (!rect) return false;
    const x = num(rect, 'x');
    const y = num(rect, 'y');
    const w = num(rect, 'width');
    const h = num(rect, 'height');
    return x + w <= vb![0] || y + h <= vb![1] || x >= vb![0] + vb![2] || y >= vb![1] + vb![3];
  };

  const walk = (el: Element, parentM: Mat, parentFill: string | null, parentEvenodd: boolean) => {
    const tag = el.tagName.toLowerCase();
    if (SKIP_TAGS.has(tag)) return;
    if (clippedAway(el)) return;

    let m = parentM;
    const tr = (el as SVGGraphicsElement).transform?.baseVal;
    if (tr && tr.numberOfItems > 0) {
      const c = tr.consolidate();
      if (c) m = mulLocal(parentM, [c.matrix.a, c.matrix.b, c.matrix.c, c.matrix.d, c.matrix.e, c.matrix.f]);
    }

    let fill = parentFill;
    const styleAttr = el.getAttribute('style') || '';
    const styleFill = /(?:^|;)\s*fill\s*:\s*([^;]+)/.exec(styleAttr)?.[1];
    const cls = (el.getAttribute('class') || '').split(/\s+/).map((c) => classes[c]).find(Boolean);
    const own = el.getAttribute('fill') ?? styleFill ?? cls;
    if (own != null) fill = normaliseColor(own) ?? parentFill ?? '#111111';

    const rule = el.getAttribute('fill-rule') || /fill-rule\s*:\s*(\w+)/.exec(styleAttr)?.[1];
    const evenodd = rule ? rule === 'evenodd' : parentEvenodd;

    const d = primitiveToPath(el);
    if (d && fill !== 'none') {
      paths.push({ d, matrix: m, fill: fill ?? '#000000', evenodd });
    }
    for (const child of Array.from(el.children)) walk(child, m, fill, evenodd);
  };
  walk(svg, IDENTITY, null, false);
  if (!paths.length) return null;

  const view = { x: vb[0], y: vb[1], w: vb[2], h: vb[3] };
  const light = paths.some((p) => (p.fill ? luminance(p.fill) > 0.5 : true));
  const dark = paths.some((p) => (p.fill ? luminance(p.fill) <= 0.5 : false));
  return { id, name, vb: view, paths, bbox: inkBox(paths, view), twoTone: light && dark, builtin, source };
}

/** Measure the artwork with a throw-away SVG element (browser only); falls back to the viewBox. */
function inkBox(paths: ShapePath[], vb: ShapeAsset['vb']): ShapeAsset['bbox'] {
  try {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('style', 'position:absolute;width:0;height:0;visibility:hidden');
    document.body.appendChild(svg);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of paths) {
      const el = document.createElementNS(ns, 'path');
      el.setAttribute('d', p.d);
      svg.appendChild(el);
      const b = el.getBBox();
      const m = p.matrix;
      for (const [x, y] of [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]]) {
        const X = m[0] * x + m[2] * y + m[4];
        const Y = m[1] * x + m[3] * y + m[5];
        x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
      }
    }
    svg.remove();
    x0 = Math.max(x0, vb.x); y0 = Math.max(y0, vb.y);
    x1 = Math.min(x1, vb.x + vb.w); y1 = Math.min(y1, vb.y + vb.h);
    if (x1 - x0 > 1 && y1 - y0 > 1) return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  } catch {
    /* fall through */
  }
  return { ...vb };
}

const mulLocal = (A: Mat, B: Mat): Mat => [
  A[0] * B[0] + A[2] * B[1],
  A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3],
  A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4],
  A[1] * B[4] + A[3] * B[5] + A[5],
];

/* ----------------------------------------------------------------------------------------------
 * Library: built-in shapes + user uploads (persisted in localStorage)
 * ------------------------------------------------------------------------------------------- */
const UPLOAD_KEY = 'luuload.pattern.uploads.v1';

export class AssetLibrary {
  private items = new Map<string, ShapeAsset>();
  private listeners = new Set<() => void>();

  constructor() {
    const built: ShapeAsset[] = [];
    for (const [file, src] of Object.entries(rawShapes)) {
      const id = file.split('/').pop()!.replace(/\.svg$/, '');
      const a = parseSvg(src, id, LABELS[id] ?? id, true);
      if (a) built.push(a);
    }
    built.sort((a, b) => {
      const ia = ORDER.indexOf(a.id);
      const ib = ORDER.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    built.forEach((a) => this.items.set(a.id, a));

    try {
      const saved = JSON.parse(localStorage.getItem(UPLOAD_KEY) || '[]') as { id: string; name: string; source: string }[];
      for (const s of saved) {
        const a = parseSvg(s.source, s.id, s.name);
        if (a) this.items.set(a.id, a);
      }
    } catch {
      /* ignore */
    }
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
  }

  list(): ShapeAsset[] {
    return [...this.items.values()];
  }

  get(id: string): ShapeAsset | undefined {
    return this.items.get(id);
  }

  /** Returns the new asset, or null when the file has no usable shapes. */
  addFromSvg(source: string, filename: string): ShapeAsset | null {
    const base = filename.replace(/\.svg$/i, '').trim() || 'asset';
    const id = `u-${base.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const a = parseSvg(source, id, base);
    if (!a) return null;
    this.items.set(id, a);
    this.persist();
    this.listeners.forEach((l) => l());
    return a;
  }

  remove(id: string) {
    const a = this.items.get(id);
    if (!a || a.builtin) return;
    this.items.delete(id);
    this.persist();
    this.listeners.forEach((l) => l());
  }

  private persist() {
    const uploads = this.list()
      .filter((a) => !a.builtin)
      .map(({ id, name, source }) => ({ id, name, source }));
    try {
      localStorage.setItem(UPLOAD_KEY, JSON.stringify(uploads));
    } catch {
      /* too large for storage — still usable for this session */
    }
  }
}
