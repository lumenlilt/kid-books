// 開書／闔書的狀態機：純資料、無副作用，vitest 驗它的形狀（每個過渡態恰一個出口事件、
// reading 之外一律忽略使用者輸入）。副作用（tween、鏡頭、貓）在 scene/book-controller.ts。
export type BookState = 'on-shelf' | 'sliding-out' | 'flying' | 'opening' | 'reading' | 'closing' | 'returning';
export type BookEvent = 'TAP' | 'ARRIVED' | 'OPENED' | 'CLOSE' | 'CLOSED' | 'RETURNED';

export const transitions: Readonly<Record<BookState, Partial<Readonly<Record<BookEvent, BookState>>>>> = {
  'on-shelf': { TAP: 'sliding-out' },
  'sliding-out': { ARRIVED: 'flying' },
  flying: { ARRIVED: 'opening' },
  opening: { OPENED: 'reading' },
  reading: { CLOSE: 'closing' },
  closing: { CLOSED: 'returning' },
  returning: { RETURNED: 'on-shelf' },
};

/** 使用者事件（其餘是動畫完成事件） */
export const USER_EVENTS: readonly BookEvent[] = ['TAP', 'CLOSE'];
/** 靜止態：會等使用者的狀態 */
export const RESTING_STATES: readonly BookState[] = ['on-shelf', 'reading'];

export function next(state: BookState, event: BookEvent): BookState | null {
  return transitions[state][event] ?? null;
}

export function isTransient(state: BookState): boolean {
  return !RESTING_STATES.includes(state);
}

export function createBookFsm(onChange?: (state: BookState, prev: BookState, event: BookEvent) => void) {
  let state: BookState = 'on-shelf';
  return {
    get state() {
      return state;
    },
    /** 回傳是否真的轉移了；沒定義的事件一律忽略（不丟錯——連點是常態） */
    send(event: BookEvent): boolean {
      const to = next(state, event);
      if (!to) return false;
      const prev = state;
      state = to;
      onChange?.(state, prev, event);
      return true;
    },
  };
}
