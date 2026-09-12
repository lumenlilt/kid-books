import { tweens, type TweenHandle } from '../lib/tween';

export type HintStep = 'repeat' | 'highlight' | 'demonstrate' | `say:${string}`;

export interface HintActions {
  repeat(): Promise<unknown>;
  say(lineId: string): Promise<unknown>;
  highlight(): Promise<unknown>;
  demonstrate(): Promise<unknown>;
}

export interface HintLadder {
  /** 開始計時（新任務） */
  arm(): void;
  /** 小孩有動作：重新計時，但階梯不退回（同一題卡越久提示越具體） */
  touch(): void;
  /** 換題：階梯歸零並停止 */
  reset(): void;
  stop(): void;
}

/** 卡關階梯：afterMs 沒動作就出下一階提示；到最後一階就一直重複最後一階。 */
export function createHintLadder(afterMs: number, ladder: readonly string[], actions: HintActions, signal: AbortSignal): HintLadder {
  let step = 0;
  let timer: TweenHandle | null = null;
  let running = false;

  const schedule = () => {
    timer?.cancel();
    if (!running || signal.aborted) return;
    timer = tweens.add({ duration: 1, delay: afterMs, onUpdate: () => {} });
    void timer.finished.then(async (r) => {
      if (r !== 'done' || !running || signal.aborted) return;
      const s = ladder[Math.min(step, ladder.length - 1)] as HintStep | undefined;
      step += 1;
      if (!s) return;
      if (s === 'repeat') await actions.repeat();
      else if (s === 'highlight') await actions.highlight();
      else if (s === 'demonstrate') await actions.demonstrate();
      else if (s.startsWith('say:')) await actions.say(s.slice(4));
      schedule();
    });
  };

  const ladderApi: HintLadder = {
    arm() {
      running = true;
      schedule();
    },
    touch() {
      if (running) schedule();
    },
    reset() {
      step = 0;
      running = false;
      timer?.cancel();
    },
    stop() {
      running = false;
      timer?.cancel();
    },
  };
  signal.addEventListener('abort', () => ladderApi.stop());
  return ladderApi;
}
