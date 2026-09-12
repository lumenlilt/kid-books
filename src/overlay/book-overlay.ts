import type { Rect } from '../lib/fit-rect';

/**
 * 書頁上的 DOM 容器：貼著投影出來的書矩形（CSS 變數），控制項用百分比排在裡面。
 * 容器本身 pointer-events:none，只有控制項開 auto，才不會蓋住 3D 的熱點。
 */
export interface BookOverlay {
  root: HTMLElement;
  setRect(rect: Rect): void;
  show(): void;
  hide(): void;
  setDebug(on: boolean): void;
}

export function createBookOverlay(container: HTMLElement): BookOverlay {
  const root = document.createElement('div');
  root.className = 'book-overlay';
  root.hidden = true;
  root.innerHTML = `
    <div class="book-frame" aria-hidden="true"></div>
    <div class="book-debug" hidden></div>`;
  container.append(root);
  const debugEl = root.querySelector<HTMLElement>('.book-debug');
  return {
    root,
    setRect(r) {
      root.style.setProperty('--book-x', `${r.x.toFixed(1)}px`);
      root.style.setProperty('--book-y', `${r.y.toFixed(1)}px`);
      root.style.setProperty('--book-w', `${r.w.toFixed(1)}px`);
      root.style.setProperty('--book-h', `${r.h.toFixed(1)}px`);
      if (debugEl && !debugEl.hidden) debugEl.textContent = `${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}x${r.h.toFixed(0)}`;
    },
    show() {
      root.hidden = false;
      root.classList.remove('is-hidden');
    },
    hide() {
      root.hidden = true;
    },
    setDebug(on) {
      if (debugEl) debugEl.hidden = !on;
      root.classList.toggle('is-debug', on);
    },
  };
}
