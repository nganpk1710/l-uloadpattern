/** Minimal typings for opentype.js 2.x (ships without any). */
declare module 'opentype.js' {
  export interface OtPath {
    commands: any[];
    toPathData(decimalPlaces?: number): string;
  }
  export interface OtGlyph {
    advanceWidth: number;
  }
  export interface OtFont {
    variation: { set(coords: Record<string, number>): void };
    getPath(text: string, x: number, y: number, fontSize: number): OtPath;
    charToGlyph(char: string): OtGlyph;
  }
  export function parse(buffer: ArrayBuffer): OtFont;
}
