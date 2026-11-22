/** Deterministic hash → [0,1). Same (seed, i, j) always gives the same value. */
export function hash01(seed: number, i: number, j = 0): number {
  let h = (seed | 0) ^ Math.imul(i + 0x9e3779b9, 0x85ebca6b) ^ Math.imul(j + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
