import ui from '../../content/ui.json';
import type { Rect } from '../lib/fit-rect';

/**
 * 閱讀時的 DOM 層：`frame` 貼著投影出來的書矩形（除錯外框），`deck` 是控制區——
 * 放在書旁邊「最方正」的那塊空地（橫式通常在右側、直式在上或下），時鐘與卡片都排在裡面。
 * 容器本身 pointer-events:none，只有控制項開 auto，才不會蓋住 3D 的熱點。
 */
export interface BookOverlay {
  root: HTMLElement;
  deck: HTMLElement;
  subtitle: { show(text: string): void; hide(): void };
  /** 控制區的可用正方形邊長（px） */
  readonly deckSize: number;
  setRect(rect: Rect, viewport: { width: number; height: number }): void;
  show(): void;
  hide(): void;
  showNext(fn: () => void): void;
  hideNext(): void;
  setDebug(on: boolean): void;
}

const nextSvg = `<svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path d="M9 5l7 7-7 7" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function createBookOverlay(container: HTMLElement): BookOverlay {
  const root = document.createElement('div');
  root.className = 'book-overlay';
  root.hidden = true;
  root.innerHTML = `
    <div class="book-frame" aria-hidden="true"></div>
    <div class="deck"></div>
    <div class="subtitle" hidden></div>
    <button class="hud-btn next-btn" type="button" aria-label="${ui.book.next}" hidden>${nextSvg}</button>
    <div class="book-debug" hidden></div>`;
  container.append(root);
  const deck = root.querySelector<HTMLElement>('.deck');
  const subtitleEl = root.querySelector<HTMLElement>('.subtitle');
  const nextBtn = root.querySelector<HTMLButtonElement>('.next-btn');
  const debugEl = root.querySelector<HTMLElement>('.book-debug');
  if (!deck || !subtitleEl || !nextBtn || !debugEl) throw new Error('overlay markup');
  let deckSize = 0;
  let nextHandler = () => {};
  nextBtn.addEventListener('click', () => nextHandler());

  return {
    root,
    deck,
    get deckSize() {
      return deckSize;
    },
    subtitle: {
      show(text) {
        subtitleEl.textContent = text;
        subtitleEl.hidden = false;
      },
      hide() {
        subtitleEl.hidden = true;
      },
    },
    setRect(r, vp) {
      root.style.setProperty('--book-x', `${r.x.toFixed(1)}px`);
      root.style.setProperty('--book-y', `${r.y.toFixed(1)}px`);
      root.style.setProperty('--book-w', `${r.w.toFixed(1)}px`);
      root.style.setProperty('--book-h', `${r.h.toFixed(1)}px`);
      const pad = 12;
      const hudTop = 92; // HUD 那一排
      const candidates: Array<Rect & { name: string }> = [
        { name: 'right', x: r.x + r.w + pad, y: hudTop, w: vp.width - (r.x + r.w) - 2 * pad, h: vp.height - hudTop - 70 },
        { name: 'left', x: pad, y: hudTop, w: r.x - 2 * pad, h: vp.height - hudTop - 70 },
        { name: 'bottom', x: pad, y: r.y + r.h + pad, w: vp.width - 2 * pad, h: vp.height - (r.y + r.h) - pad - 70 },
        { name: 'top', x: pad, y: hudTop, w: vp.width - 2 * pad, h: r.y - hudTop - pad },
      ];
      const best = candidates.reduce((a, b) => (Math.min(b.w, b.h) > Math.min(a.w, a.h) ? b : a));
      deckSize = Math.max(0, Math.min(best.w, best.h));
      deck.style.left = `${best.x}px`;
      deck.style.top = `${best.y}px`;
      deck.style.width = `${best.w}px`;
      deck.style.height = `${best.h}px`;
      deck.dataset['zone'] = best.name;
      if (!debugEl.hidden) debugEl.textContent = `${r.x.toFixed(0)},${r.y.toFixed(0)} ${r.w.toFixed(0)}x${r.h.toFixed(0)} deck:${best.name} ${deckSize.toFixed(0)}`;
    },
    show() {
      root.hidden = false;
    },
    hide() {
      root.hidden = true;
      nextBtn.hidden = true;
      subtitleEl.hidden = true;
    },
    showNext(fn) {
      nextHandler = fn;
      nextBtn.hidden = false;
    },
    hideNext() {
      nextBtn.hidden = true;
    },
    setDebug(on) {
      debugEl.hidden = !on;
      root.classList.toggle('is-debug', on);
    },
  };
}
