import type { PatternId } from '../core/state';
import { renderShapeLoop } from './shapeLoop';
import { renderTextOffset } from './textOffset';
import { renderWideNarrow } from './wideNarrow';
import type { RenderContext } from './types';

export const PATTERNS: { id: PatternId; index: string; name: string; sub: string; render: (rc: RenderContext) => void }[] = [
  { id: 'shape', index: '01', name: 'Shape Loop', sub: 'Lặp hình học', render: renderShapeLoop },
  { id: 'text', index: '02', name: 'Text Offset', sub: 'Dịch chuyển chữ', render: renderTextOffset },
  { id: 'wide', index: '03', name: 'Wide → Narrow', sub: 'Co giãn hẹp – rộng', render: renderWideNarrow },
];

/** Draw one complete frame (background + pattern) onto any painter. */
export function renderFrame(rc: RenderContext) {
  rc.painter.begin(rc.state.color.bg);
  PATTERNS.find((p) => p.id === rc.state.pattern)!.render(rc);
}
