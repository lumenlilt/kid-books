// 自寫的小 tween：夠這個專案用，而且是 MIT 的（GSAP 免費但不是 OSS 授權）。
// 單一 runner 由渲染迴圈餵 dt，所有動畫都是「同一個時間」，seek／暫停才做得到。

export type Ease = (t: number) => number;

export const easeLinear: Ease = (t) => t;
export const easeOutCubic: Ease = (t) => 1 - (1 - t) ** 3;
export const easeInOutCubic: Ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
export const easeOutBack: Ease = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
export const easeOutElastic: Ease = (t) => {
  if (t === 0 || t === 1) return t;
  return 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
export const easeInOutSine: Ease = (t) => -(Math.cos(Math.PI * t) - 1) / 2;

export type TweenResult = 'done' | 'cancelled';

export interface TweenOptions {
  /** 毫秒 */
  duration: number;
  delay?: number;
  ease?: Ease;
  onUpdate: (t: number) => void;
}

export interface TweenHandle {
  readonly finished: Promise<TweenResult>;
  cancel(): void;
}

interface Item {
  elapsed: number;
  opts: Required<Pick<TweenOptions, 'duration' | 'delay' | 'ease'>> & TweenOptions;
  resolve: (r: TweenResult) => void;
  cancelled: boolean;
}

export class TweenRunner {
  private items: Item[] = [];

  add(opts: TweenOptions): TweenHandle {
    let resolve!: (r: TweenResult) => void;
    const finished = new Promise<TweenResult>((r) => {
      resolve = r;
    });
    const item: Item = {
      elapsed: 0,
      opts: { delay: 0, ease: easeOutCubic, ...opts },
      resolve,
      cancelled: false,
    };
    this.items.push(item);
    return {
      finished,
      cancel: () => {
        if (item.cancelled) return;
        item.cancelled = true;
        item.resolve('cancelled');
      },
    };
  }

  /** dt 以秒計（渲染迴圈給的） */
  update(dt: number): void {
    const ms = dt * 1000;
    const keep: Item[] = [];
    for (const item of this.items) {
      if (item.cancelled) continue;
      item.elapsed += ms;
      const local = item.elapsed - item.opts.delay;
      if (local < 0) {
        keep.push(item);
        continue;
      }
      const t = Math.min(1, local / Math.max(1, item.opts.duration));
      item.opts.onUpdate(item.opts.ease(t));
      if (t >= 1) item.resolve('done');
      else keep.push(item);
    }
    this.items = keep;
  }

  get active(): number {
    return this.items.length;
  }
}

/** 全域 runner：main.ts 每幀呼叫 `tweens.update(dt)`。 */
export const tweens = new TweenRunner();

export function tween(opts: TweenOptions): TweenHandle {
  return tweens.add(opts);
}

/** 用 tween 時間軸的 delay（不是 setTimeout），暫停時會一起停。 */
export function wait(ms: number): Promise<TweenResult> {
  return tweens.add({ duration: 1, delay: ms, onUpdate: () => {} }).finished;
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));
