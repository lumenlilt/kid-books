// 時鐘的純數學。角度一律「順時針、12 點為 0 度」；時間一律 24 小時制的總分鐘數。
export const MINUTES_PER_DAY = 24 * 60;

export const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** 時針角度（0..360）：含分鐘的位移 */
export const hourAngle = (h: number, m: number): number => mod(((h % 12) + m / 60) * 30, 360);
/** 分針角度（0..360） */
export const minuteAngle = (m: number): number => mod(m * 6, 360);

/** 角度 → 時針位置代表的分鐘（0..720） */
export const hourAngleToMinutes = (deg: number): number => (mod(deg, 360) / 360) * 720;
/** 角度 → 分針位置代表的分鐘（0..60） */
export const minuteAngleToMinutes = (deg: number): number => (mod(deg, 360) / 360) * 60;

/** 兩角度的最短差（-180..180） */
export const angleDelta = (from: number, to: number): number => mod(to - from + 180, 360) - 180;

/** 吸附到 step 分鐘（30＝半點、60＝整點） */
export const snapMinutes = (total: number, step: number): number => mod(Math.round(total / step) * step, MINUTES_PER_DAY);

/** 總分鐘 → {h, m} */
export const fromTotal = (total: number): { h: number; m: number } => {
  const t = mod(Math.round(total), MINUTES_PER_DAY);
  return { h: Math.floor(t / 60), m: t % 60 };
};
export const toTotal = (t: { h: number; m: number }): number => mod(t.h * 60 + t.m, MINUTES_PER_DAY);

/** 12 小時面上兩個時間是否同一格（3:00 與 15:00 在鐘面上一樣） */
export const sameOnFace = (a: { h: number; m: number }, b: { h: number; m: number }): boolean => mod(toTotal(a), 720) === mod(toTotal(b), 720);

/**
 * 拖分針：用角度增量累積總分鐘，跨過 12 不會跳。時針以 1/12 連動（外面用 fromTotal 算）。
 * 拖時針：每度 = 2 分鐘。
 */
export const dragTotal = (total: number, deltaDeg: number, hand: 'hour' | 'minute'): number =>
  mod(total + (hand === 'minute' ? deltaDeg / 6 : deltaDeg * 2), MINUTES_PER_DAY);

/** 顯示：24h → 12h 與時段 */
export type Period = 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';
export const display = (h24: number): { h12: number; period: Period } => {
  const h = mod(h24, 24);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const period: Period = h < 5 ? 'night' : h < 11 ? 'morning' : h < 14 ? 'noon' : h < 18 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  return { h12, period };
};

/** 在容差內算到達（角度） */
export const within = (a: number, b: number, tolDeg: number): boolean => Math.abs(angleDelta(a, b)) <= tolDeg;
