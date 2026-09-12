import { Howl, Howler } from 'howler';

export type SfxName = 'tap' | 'select' | 'correct' | 'wrong' | 'drop' | 'open' | 'close' | 'star' | 'fanfare' | 'toggle' | 'whoosh' | 'question';

/** SFX → Kenney Interface Sounds（CC0，public/assets/sfx/kenney，LEDGER 登記） */
const SFX_FILES: Record<SfxName, string> = {
  tap: 'click_001', select: 'select_001', correct: 'confirmation_001', wrong: 'error_004', drop: 'drop_002', open: 'open_001',
  close: 'close_001', star: 'pluck_001', fanfare: 'bong_001', toggle: 'toggle_001', whoosh: 'maximize_001', question: 'question_001',
};

export type PlayResult = 'ended' | 'interrupted';

export interface AudioBus {
  /** 第一次使用者手勢時呼叫（Howler 也會自己解鎖，這裡多做 resume） */
  unlock(): void;
  /** 旁白：同時只有一句，新句打斷舊句。音檔缺或 context 沒解鎖就 reject，讓旁白退回估時。 */
  play(bookId: string, lineId: string, opts?: { rate?: number }): Promise<PlayResult>;
  stop(): void;
  sfx(name: SfxName, opts?: { volume?: number; rate?: number }): void;
  setMuted(muted: boolean): void;
  preload(bookId: string, lineIds: readonly string[]): void;
  unloadBook(bookId: string): void;
  /** 旁白目前音量 0..1（貓嘴用），每幀讀 */
  level(): number;
  /** 每幀呼叫：自己判斷旁白播完（seek ≥ duration），不靠 Howler 的 setTimeout——背景分頁計時器會被節流 */
  tick(): void;
  readonly unlocked: boolean;
}

export function createAudioBus(): AudioBus {
  const narration = new Map<string, Howl>();
  const sfx = new Map<SfxName, Howl>();
  let current: { key: string; howl: Howl; id: number; resolve: (r: PlayResult) => void } | null = null;
  let analyser: AnalyserNode | null = null;
  let buffer: Uint8Array<ArrayBuffer> | null = null;
  let muted = false;

  const ctxRunning = () => Howler.ctx?.state === 'running';

  const ensureAnalyser = () => {
    if (analyser || !Howler.ctx || !Howler.masterGain) return;
    analyser = Howler.ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.5;
    Howler.masterGain.connect(analyser);
    buffer = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  };

  for (const [name, file] of Object.entries(SFX_FILES) as Array<[SfxName, string]>) {
    sfx.set(name, new Howl({ src: [`/assets/sfx/kenney/${file}.mp3`], preload: true, volume: 0.6 }));
  }

  const howlFor = (bookId: string, lineId: string): Howl => {
    const key = `${bookId}.${lineId}`;
    let h = narration.get(key);
    if (!h) {
      h = new Howl({ src: [`/audio/${bookId}/${lineId}.mp3`], preload: true });
      narration.set(key, h);
    }
    return h;
  };

  const finish = (r: PlayResult) => {
    const c = current;
    current = null;
    c?.resolve(r);
  };

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Howler.ctx?.state === 'suspended') void Howler.ctx.resume();
  });

  return {
    get unlocked() {
      return ctxRunning();
    },
    unlock() {
      if (Howler.ctx?.state === 'suspended') void Howler.ctx.resume();
      ensureAnalyser();
    },
    play(bookId, lineId, opts = {}) {
      this.stop();
      return new Promise<PlayResult>((resolve, reject) => {
        if (!ctxRunning()) {
          reject(new Error('audio locked'));
          return;
        }
        ensureAnalyser();
        const howl = howlFor(bookId, lineId);
        const key = `${bookId}.${lineId}`;
        const start = () => {
          const id = howl.play();
          if (opts.rate) howl.rate(Math.min(4, Math.max(0.5, opts.rate)), id);
          current = { key, howl, id, resolve };
          howl.once('end', () => {
            if (current?.id === id) finish('ended');
          }, id);
        };
        if (howl.state() === 'loaded') start();
        else {
          howl.once('load', start);
          howl.once('loaderror', () => reject(new Error(`missing audio ${key}`)));
        }
      });
    },
    stop() {
      if (!current) return;
      current.howl.stop(current.id);
      finish('interrupted');
    },
    sfx(name, opts = {}) {
      const h = sfx.get(name);
      if (!h || muted) return;
      const id = h.play();
      if (opts.volume !== undefined) h.volume(opts.volume, id);
      if (opts.rate !== undefined) h.rate(opts.rate, id);
    },
    setMuted(m) {
      muted = m;
      Howler.mute(m);
    },
    preload(bookId, lineIds) {
      for (const id of lineIds) howlFor(bookId, id);
    },
    unloadBook(bookId) {
      for (const [key, h] of narration) {
        if (key.startsWith(`${bookId}.`)) {
          h.unload();
          narration.delete(key);
        }
      }
    },
    tick() {
      if (!current) return;
      const { howl, id } = current;
      const dur = howl.duration(id);
      const pos = howl.seek(id);
      if (typeof pos === 'number' && dur > 0 && pos >= dur - 0.03) {
        howl.stop(id);
        finish('ended');
      } else if (!howl.playing(id) && howl.state() === 'loaded' && typeof pos === 'number' && pos >= dur - 0.05) {
        finish('ended');
      }
    },
    level() {
      if (!current || !analyser || !buffer) return 0;
      analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const v of buffer) {
        const d = (v - 128) / 128;
        sum += d * d;
      }
      return Math.min(1, Math.sqrt(sum / buffer.length) * 4);
    },
  };
}
