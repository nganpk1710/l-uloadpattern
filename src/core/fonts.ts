import bigShouldersUrl from '../assets/fonts/BigShoulders-Variable.ttf?url';

export const FONT_FAMILY = '"Big Shoulders"';
export const BIG_SHOULDERS_URL = bigShouldersUrl;

/**
 * Aeonik is a commercial typeface, so it is not bundled. Drop licensed files into
 * src/assets/fonts/aeonik/ (e.g. Aeonik-Regular.woff2, Aeonik-Medium.woff2, Aeonik-Bold.woff2)
 * and they are registered automatically — no code change needed.
 */
const aeonikFiles = import.meta.glob('../assets/fonts/aeonik/*.{woff2,woff,otf,ttf}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const WEIGHTS: [RegExp, number][] = [
  [/thin/i, 100],
  [/extralight|ultralight/i, 200],
  [/light/i, 300],
  [/medium/i, 500],
  [/semibold|demibold/i, 600],
  [/extrabold|ultrabold/i, 800],
  [/black|heavy/i, 900],
  [/bold/i, 700],
];

export async function loadFonts(): Promise<{ aeonik: boolean }> {
  const faces: FontFace[] = [];

  faces.push(
    new FontFace('Big Shoulders', `url(${bigShouldersUrl})`, {
      weight: '100 900',
      style: 'normal',
      display: 'block',
    }),
  );

  const aeonikEntries = Object.entries(aeonikFiles);
  for (const [file, url] of aeonikEntries) {
    const name = file.split('/').pop() ?? '';
    const weight = WEIGHTS.find(([re]) => re.test(name))?.[1] ?? 400;
    const style = /italic/i.test(name) ? 'italic' : 'normal';
    faces.push(new FontFace('Aeonik', `url(${url})`, { weight: String(weight), style, display: 'swap' }));
  }

  await Promise.all(
    faces.map(async (f) => {
      try {
        await f.load();
        document.fonts.add(f);
      } catch (err) {
        console.warn('Font failed to load', f.family, err);
      }
    }),
  );
  document.documentElement.classList.toggle('has-aeonik', aeonikEntries.length > 0);
  return { aeonik: aeonikEntries.length > 0 };
}

/* ----------------------------------------------------------------------------------------------
 * Text metrics (size 100, cached) — patterns use these to fit glyphs into boxes
 * ------------------------------------------------------------------------------------------- */
export interface Metrics {
  /** advance width */
  adv: number;
  /** ink bounds relative to the origin: left extent (positive = left of origin) and right extent */
  inkL: number;
  inkR: number;
  /** ink height above the baseline */
  asc: number;
}

let mctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, Metrics>();
let capCache: number | null = null;

const getCtx = () => {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d')!;
  return mctx;
};

export function measure(str: string, weight: number, tracking = 0): Metrics {
  const w = Math.round(weight / 10) * 10; // bucket for cache
  const key = `${w}|${tracking}|${str}`;
  let m = cache.get(key);
  if (!m) {
    const ctx = getCtx();
    ctx.font = `${w} 100px ${FONT_FAMILY}`;
    (ctx as any).letterSpacing = `${tracking * 100}px`;
    const t = ctx.measureText(str);
    (ctx as any).letterSpacing = '0px';
    m = { adv: t.width, inkL: t.actualBoundingBoxLeft, inkR: t.actualBoundingBoxRight, asc: t.actualBoundingBoxAscent };
    cache.set(key, m);
  }
  return m;
}

/** Cap height at size 100 (identical across weights for this family). */
export function capHeight(): number {
  if (capCache == null) {
    const ctx = getCtx();
    ctx.font = `900 100px ${FONT_FAMILY}`;
    capCache = ctx.measureText('H').actualBoundingBoxAscent || 70;
  }
  return capCache;
}

export function clearMetricsCache() {
  cache.clear();
  capCache = null;
}
