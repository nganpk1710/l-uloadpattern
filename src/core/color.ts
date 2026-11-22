export interface BrandColor {
  hex: string;
  name: string;
}

/** Bảng màu thương hiệu Lưu Load. Thứ tự = thứ tự hiển thị. */
export const BRAND_COLORS: BrandColor[] = [
  { hex: '#fdfdfd', name: 'Trắng ngà' },
  { hex: '#111111', name: 'Đen mực' },
  { hex: '#0800b2', name: 'Xanh cobalt' },
  { hex: '#fff11c', name: 'Vàng chanh' },
  { hex: '#ba2016', name: 'Đỏ gạch' },
  { hex: '#4bffdf', name: 'Xanh bạc hà' },
  { hex: '#ff6932', name: 'Cam' },
  { hex: '#24fc7d', name: 'Xanh lá' },
];

export const luminance = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
};

export const contrast = (a: string, b: string): number => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

export interface ColorPreset {
  id: string;
  name: string;
  bg: string;
  fg: string[];
}

export const COLOR_PRESETS: ColorPreset[] = [
  { id: 'cobalt-pop', name: 'Cobalt Pop', bg: '#0800b2', fg: ['#fdfdfd', '#fff11c', '#ba2016'] },
  { id: 'paper-ink', name: 'Paper Ink', bg: '#fdfdfd', fg: ['#111111', '#0800b2'] },
  { id: 'lemon', name: 'Lemon', bg: '#fff11c', fg: ['#111111', '#0800b2'] },
  { id: 'brick', name: 'Brick', bg: '#fdfdfd', fg: ['#ba2016', '#111111'] },
  { id: 'neon', name: 'Neon Night', bg: '#111111', fg: ['#24fc7d', '#4bffdf', '#fff11c'] },
  { id: 'sunset', name: 'Sunset', bg: '#111111', fg: ['#ff6932', '#fff11c', '#ba2016'] },
  { id: 'spectrum', name: 'Spectrum', bg: '#fdfdfd', fg: ['#0800b2', '#ba2016', '#ff6932', '#24fc7d', '#4bffdf', '#111111'] },
  { id: 'mint', name: 'Mint', bg: '#4bffdf', fg: ['#0800b2', '#111111'] },
];

/** Random on-brand palette that always keeps readable contrast against the background. */
export function randomPalette(rand: () => number): { bg: string; fg: string[] } {
  const hexes = BRAND_COLORS.map((c) => c.hex);
  const bg = hexes[Math.floor(rand() * hexes.length)];
  const pool = hexes.filter((h) => h !== bg && contrast(h, bg) >= 2.2);
  const count = 1 + Math.floor(rand() * Math.min(3, pool.length));
  const fg: string[] = [];
  while (fg.length < count && pool.length) {
    fg.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return { bg, fg: fg.length ? fg : [luminance(bg) > 0.4 ? '#111111' : '#fdfdfd'] };
}
