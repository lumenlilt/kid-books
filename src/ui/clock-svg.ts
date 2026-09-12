import { angleDelta, dragTotal, fromTotal, hourAngle, minuteAngle, mod, snapMinutes } from '../lib/clock-math';
import { easeInOutCubic, tween, type TweenHandle } from '../lib/tween';

export type Hand = 'hour' | 'minute';
export interface ClockMode {
  hands: 'hour' | 'both';
  draggable: Hand[];
  snap: 60 | 30 | null;
}
export type ChangeSource = 'drag' | 'set';

/**
 * 小孩拖的那個大時鐘（DOM／SVG）。邏輯全在 lib/clock-math：這裡只是視圖＋pointer 事件。
 * 觸控目標：指針尖端的隱形圓 r=22（viewBox 200），時鐘 300 px 時約 66 px。
 */
export interface ClockSvg {
  el: SVGSVGElement;
  getTotal(): number;
  setTotal(total: number, source?: ChangeSource): void;
  setMode(mode: Partial<ClockMode>): void;
  onChange(fn: (total: number, source: ChangeSource) => void): () => void;
  onInteract(fn: () => void): () => void;
  onRelease(fn: (total: number) => void): () => void;
  highlight(hour: number | null): void;
  ghost(total: number | null): void;
  animateTo(total: number, ms?: number): Promise<void>;
  setInteractive(on: boolean): void;
  destroy(): void;
}

const NS = 'http://www.w3.org/2000/svg';
const C = 100;

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export function createClockSvg(): ClockSvg {
  const el = svg('svg', { viewBox: '0 0 200 200', class: 'clock', role: 'img' });
  el.style.touchAction = 'none';

  el.append(svg('circle', { cx: C, cy: C, r: 94, class: 'clock-rim' }));
  el.append(svg('circle', { cx: C, cy: C, r: 88, class: 'clock-face' }));
  const ticks = svg('g', { class: 'clock-ticks' });
  for (let i = 0; i < 60; i += 1) {
    const a = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const r1 = big ? 78 : 82;
    ticks.append(svg('line', { x1: C + Math.sin(a) * r1, y1: C - Math.cos(a) * r1, x2: C + Math.sin(a) * 86, y2: C - Math.cos(a) * 86, class: big ? 'tick big' : 'tick' }));
  }
  el.append(ticks);
  const numerals = new Map<number, SVGTextElement>();
  for (let h = 1; h <= 12; h += 1) {
    const a = (h / 12) * Math.PI * 2;
    const t = svg('text', { x: C + Math.sin(a) * 66, y: C - Math.cos(a) * 66, class: 'clock-num', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    t.textContent = String(h);
    numerals.set(h, t);
    el.append(t);
  }

  const ghostG = svg('g', { class: 'clock-ghost', visibility: 'hidden' });
  const ghostHour = svg('g');
  ghostHour.append(svg('rect', { x: C - 5, y: C - 46, width: 10, height: 52, rx: 5, class: 'ghost-hand' }));
  const ghostMinute = svg('g');
  ghostMinute.append(svg('rect', { x: C - 3.5, y: C - 70, width: 7, height: 76, rx: 3.5, class: 'ghost-hand' }));
  ghostG.append(ghostHour, ghostMinute);
  el.append(ghostG);

  const makeHand = (kind: Hand) => {
    const g = svg('g', { class: `clock-hand ${kind}` });
    const len = kind === 'hour' ? 46 : 70;
    const w = kind === 'hour' ? 11 : 8;
    g.append(svg('rect', { x: C - w / 2, y: C - len, width: w, height: len + 8, rx: w / 2, class: 'hand-body' }));
    // 隱形的大觸控區：沿指針一條寬帶＋尖端一個圓
    g.append(svg('rect', { x: C - 14, y: C - len - 10, width: 28, height: len + 20, class: 'hand-hit' }));
    g.append(svg('circle', { cx: C, cy: C - len, r: 22, class: 'hand-hit' }));
    return g;
  };
  const minuteG = makeHand('minute');
  const hourG = makeHand('hour');
  el.append(minuteG, hourG);
  el.append(svg('circle', { cx: C, cy: C, r: 7, class: 'clock-pin' }));

  let total = 9 * 60;
  let mode: ClockMode = { hands: 'both', draggable: ['hour', 'minute'], snap: null };
  let interactive = true;
  const changeFns = new Set<(t: number, s: ChangeSource) => void>();
  const interactFns = new Set<() => void>();
  const releaseFns = new Set<(t: number) => void>();
  let anim: TweenHandle | null = null;

  const render = () => {
    const { h, m } = fromTotal(total);
    hourG.setAttribute('transform', `rotate(${hourAngle(h, m)} ${C} ${C})`);
    minuteG.setAttribute('transform', `rotate(${minuteAngle(m)} ${C} ${C})`);
    minuteG.style.visibility = mode.hands === 'both' ? 'visible' : 'hidden';
  };
  const emit = (source: ChangeSource) => {
    for (const fn of changeFns) fn(total, source);
  };
  const applyMode = () => {
    hourG.classList.toggle('draggable', interactive && mode.draggable.includes('hour'));
    minuteG.classList.toggle('draggable', interactive && mode.draggable.includes('minute'));
    render();
  };

  // 拖曳
  const angleOf = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    return mod((Math.atan2(dx, -dy) * 180) / Math.PI, 360);
  };
  let drag: { hand: Hand; last: number; id: number } | null = null;
  const onDown = (hand: Hand) => (e: PointerEvent) => {
    if (!interactive || !mode.draggable.includes(hand) || drag) return;
    e.preventDefault();
    anim?.cancel();
    drag = { hand, last: angleOf(e), id: e.pointerId };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // 合成事件或已失效的指標沒有 capture 可拿；沒有 capture 拖曳也還能動
    }
    el.classList.add('is-dragging');
    for (const fn of interactFns) fn();
  };
  const onMove = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const a = angleOf(e);
    const delta = angleDelta(drag.last, a);
    drag.last = a;
    total = dragTotal(total, delta, drag.hand);
    render();
    emit('drag');
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    el.classList.remove('is-dragging');
    const snapped = mode.snap ? snapMinutes(total, mode.snap) : Math.round(total);
    void api.animateTo(snapped, 160).then(() => {
      for (const fn of releaseFns) fn(total);
    });
  };
  hourG.addEventListener('pointerdown', onDown('hour'));
  minuteG.addEventListener('pointerdown', onDown('minute'));
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);

  const api: ClockSvg = {
    el,
    getTotal: () => total,
    setTotal(t, source = 'set') {
      total = mod(t, 24 * 60);
      render();
      emit(source);
    },
    setMode(m) {
      mode = { ...mode, ...m };
      applyMode();
    },
    onChange(fn) {
      changeFns.add(fn);
      return () => changeFns.delete(fn);
    },
    onInteract(fn) {
      interactFns.add(fn);
      return () => interactFns.delete(fn);
    },
    onRelease(fn) {
      releaseFns.add(fn);
      return () => releaseFns.delete(fn);
    },
    highlight(hour) {
      for (const [h, t] of numerals) t.classList.toggle('is-target', hour !== null && h === ((hour % 12) || 12));
    },
    ghost(t) {
      if (t === null) {
        ghostG.setAttribute('visibility', 'hidden');
        return;
      }
      const { h, m } = fromTotal(t);
      ghostHour.setAttribute('transform', `rotate(${hourAngle(h, m)} ${C} ${C})`);
      ghostMinute.setAttribute('transform', `rotate(${minuteAngle(m)} ${C} ${C})`);
      ghostMinute.style.visibility = mode.hands === 'both' ? 'visible' : 'hidden';
      ghostG.setAttribute('visibility', 'visible');
    },
    animateTo(target, ms = 900) {
      anim?.cancel();
      const from = total;
      // 走最短方向（分針一圈內），但示範跨時要順時針：用 24h 總分鐘的短差
      let diff = mod(target - from + 12 * 60, 24 * 60) - 12 * 60;
      if (Math.abs(diff) < 1) diff = 0;
      anim = tween({
        duration: ms,
        ease: easeInOutCubic,
        onUpdate: (k) => {
          total = mod(from + diff * k, 24 * 60);
          render();
          emit('set');
        },
      });
      return anim.finished.then(() => {
        total = mod(target, 24 * 60);
        render();
        emit('set');
      });
    },
    setInteractive(on) {
      interactive = on;
      applyMode();
    },
    destroy() {
      anim?.cancel();
      el.remove();
    },
  };
  applyMode();
  return api;
}
