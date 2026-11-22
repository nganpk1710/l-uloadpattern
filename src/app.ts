import { AssetLibrary } from './core/assets';
import { clearMetricsCache, loadFonts } from './core/fonts';
import { Store } from './core/state';
import { h } from './ui/dom';
import { buildPanels } from './ui/panels';
import { buildStage } from './ui/stage';
import type { PatternId } from './core/state';
import { PATTERNS } from './patterns';

export async function startApp(root: HTMLElement) {
  const store = new Store();
  const lib = new AssetLibrary();

  // drop saved asset ids that no longer exist (e.g. a removed upload)
  store.state.assets.selected = store.state.assets.selected.filter((id) => lib.get(id));
  if (!store.state.assets.selected.length) store.state.assets.selected = [lib.list()[0].id];

  const stage = buildStage(store, lib);
  const panels = buildPanels(store, lib);

  const undoBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', title: 'Hoàn tác (Ctrl/⌘ + Z)', 'aria-label': 'Hoàn tác', onclick: () => store.undo() }, '↶');
  const redoBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', title: 'Làm lại (Ctrl/⌘ + Shift + Z)', 'aria-label': 'Làm lại', onclick: () => store.redo() }, '↷');
  const resetBtn = h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => store.reset() }, 'Đặt lại');

  const header = h(
    'header',
    { class: 'top' },
    h(
      'div',
      { class: 'top__brand' },
      h('span', { class: 'top__logo' }, 'LƯU LOAD'),
      h('span', { class: 'top__rule' }),
      h('span', { class: 'top__title' }, 'Motion Pattern Toolkit'),
    ),
    h(
      'div',
      { class: 'top__right' },
      h('span', { class: 'top__keys' }, h('kbd', {}, 'Space'), ' phát/dừng  ', h('kbd', {}, '1'), h('kbd', {}, '2'), ' đổi pattern  ', h('kbd', {}, 'R'), ' ngẫu nhiên'),
      undoBtn,
      redoBtn,
      resetBtn,
    ),
    h('span', { class: 'top__load', 'aria-hidden': 'true' }),
  );

  const left = h('aside', { class: 'panel panel--left', 'aria-label': 'Nội dung và màu' }, ...panels.left.map((s) => s.el));
  const right = h('aside', { class: 'panel panel--right', 'aria-label': 'Điều khiển chuyển động' }, ...panels.right.map((s) => s.el));
  const center = h('main', { class: 'stage' }, h('div', { class: 'stage__sticky' }, stage.tabbar, stage.frameWrap, stage.transport), stage.dock);

  root.replaceChildren(header, h('div', { class: 'layout' }, left, center, right));

  const allSections = [...panels.left, ...panels.right];
  const sync = () => {
    const s = store.state;
    document.documentElement.dataset.pattern = s.pattern;
    let n = 0;
    for (const sec of allSections) {
      sec.ctls.forEach((c) => c.sync(s));
      sec.el.hidden = sec.ctls.every((c) => c.el.hidden);
      if (!sec.el.hidden) sec.el.querySelector('.sec__index')!.textContent = String(++n).padStart(2, '0');
    }
    undoBtn.disabled = !store.canUndo;
    redoBtn.disabled = !store.canRedo;
    stage.sync(s);
  };
  store.subscribe(sync);
  sync();

  // keyboard shortcuts (ignored while typing)
  window.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if ((e.metaKey || e.ctrlKey) && !e.altKey && !t.closest('input[type="text"], textarea, select')) {
      if (e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (e.code === 'KeyY') {
        e.preventDefault();
        store.redo();
        return;
      }
    }
    if (t.closest('input[type="text"], textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === 'Space' && !(t instanceof HTMLButtonElement)) {
      e.preventDefault();
      stage.togglePlay();
    } else if (['Digit1', 'Digit2'].includes(e.code)) {
      store.set('pattern', PATTERNS[+e.code.slice(-1) - 1].id as PatternId);
    } else if (e.key === 'r' || e.key === 'R') {
      store.set('color.seed', (Math.random() * 1e6) | 0);
    } else if (e.key === 'ArrowLeft') stage.step(-1);
    else if (e.key === 'ArrowRight') stage.step(1);
  });

  // fonts are needed for text metrics — render once they are ready, then re-measure
  await loadFonts();
  clearMetricsCache();
  document.documentElement.classList.add('is-ready');
  stage.markDirty();
  stage.start();
}
