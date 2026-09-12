import { tweens } from '../lib/tween';

export type SayResult = 'ended' | 'interrupted';

export interface NarratorDeps {
  subtitle: { show(text: string): void; hide(): void };
  talking: (on: boolean) => void;
  /** 播音檔；回 null 代表沒有音檔（M5 之前一律 null） */
  play?: (lineId: string) => Promise<SayResult> | null;
  /** 估時倍率（除錯 ?fast=1 用 0.15） */
  speed?: number;
}

export interface Narrator {
  say(lineId: string): Promise<SayResult>;
  stop(): void;
  setLines(lines: Record<string, string>): void;
  readonly speaking: boolean;
}

/** 同時只有一句：新句打斷舊句。沒有音檔時用字數估時長（給家長看的字幕還是會出現）。 */
export function createNarrator(deps: NarratorDeps): Narrator {
  let current: { id: number; resolve: (r: SayResult) => void; cancel: () => void } | null = null;
  let seq = 0;
  let lines: Record<string, string> = {};

  const finish = (r: SayResult) => {
    const c = current;
    current = null;
    deps.talking(false);
    if (r === 'ended') tweens.add({ duration: 1, delay: 900, onUpdate: () => {} }).finished.then(() => { if (!current) deps.subtitle.hide(); });
    else deps.subtitle.hide();
    c?.resolve(r);
  };

  return {
    get speaking() {
      return current !== null;
    },
    setLines(l) {
      lines = l;
    },
    stop() {
      if (!current) return;
      current.cancel();
      finish('interrupted');
    },
    say(lineId) {
      this.stop();
      const text = lines[lineId] ?? `[${lineId}]`;
      const id = (seq += 1);
      deps.subtitle.show(text);
      deps.talking(true);
      return new Promise<SayResult>((resolve) => {
        const audio = deps.play?.(lineId) ?? null;
        if (audio) {
          let cancelled = false;
          current = { id, resolve, cancel: () => { cancelled = true; } };
          void audio.then((r) => { if (!cancelled && current?.id === id) finish(r); });
          return;
        }
        const ms = Math.max(300, (400 + text.replace(/[\s\u3000-\u303F\uFF00-\uFFEF]/g, '').length * 210) * (deps.speed ?? 1));
        const h = tweens.add({ duration: 1, delay: ms, onUpdate: () => {} });
        current = { id, resolve, cancel: () => h.cancel() };
        void h.finished.then((r) => { if (r === 'done' && current?.id === id) finish('ended'); });
      });
    },
  };
}
