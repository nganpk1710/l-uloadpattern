/** 2D affine matrix [a b c d e f] — x' = a·x + c·y + e, y' = b·x + d·y + f */
export type Mat = [number, number, number, number, number, number];

export const IDENTITY: Mat = [1, 0, 0, 1, 0, 0];

export const mul = (A: Mat, B: Mat): Mat => [
  A[0] * B[0] + A[2] * B[1],
  A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3],
  A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4],
  A[1] * B[4] + A[3] * B[5] + A[5],
];

/** Compose left→right: compose(A, B, C) applies C first, then B, then A. */
export const compose = (...ms: Mat[]): Mat => ms.reduce((acc, m) => mul(acc, m), IDENTITY);

export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const scale = (sx: number, sy = sx): Mat => [sx, 0, 0, sy, 0, 0];
export const rotate = (r: number): Mat => {
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [c, s, -s, c, 0, 0];
};

/** Largest axis scale of a matrix. Stable even when one axis collapses (e.g. mid-flip). */
export const matScale = (m: Mat) => Math.max(Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3])) || 1;

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const frac = (x: number) => x - Math.floor(x);
export const round = (v: number, p = 3) => {
  const k = 10 ** p;
  return Math.round(v * k) / k;
};
