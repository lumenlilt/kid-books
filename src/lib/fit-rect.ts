// 純函式：閱讀姿態的鏡頭距離、投影點集合的螢幕矩形。沒有 three 依賴，vitest 直接測。

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Ndc {
  x: number;
  y: number;
}

/** NDC（-1..1，y 向上）點集合 → CSS 像素矩形（y 向下） */
export function ndcBounds(points: readonly Ndc[], width: number, height: number): Rect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    const sx = ((p.x + 1) / 2) * width;
    const sy = ((1 - p.y) / 2) * height;
    minX = Math.min(minX, sx);
    maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy);
    maxY = Math.max(maxY, sy);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * 給定「距離 d 時點集合的 NDC 最大絕對值 extent(d)」，找出最小的 d 使 extent(d) ≤ margin。
 * 投影尺度大致 ∝ 1/d，用比例修正迭代六次就夠。
 */
export function solveFitDistance(extentAt: (d: number) => number, start: number, margin = 0.9, minD = 0.3, maxD = 50): number {
  let d = Math.min(maxD, Math.max(minD, start));
  for (let i = 0; i < 8; i += 1) {
    const e = extentAt(d);
    if (!Number.isFinite(e) || e <= 0) break;
    const nextD = Math.min(maxD, Math.max(minD, d * (e / margin)));
    if (Math.abs(nextD - d) < 1e-3) {
      d = nextD;
      break;
    }
    d = nextD;
  }
  // 最後保證不超界：往外推到夠為止
  for (let i = 0; i < 20 && extentAt(d) > margin && d < maxD; i += 1) d *= 1.05;
  return d;
}

/** 分段上升：t 在 [a,b] 之間線性 0→1，外面夾住。給立體書各層交錯立起用。 */
export function segment(t: number, a: number, b: number): number {
  if (b <= a) return t >= b ? 1 : 0;
  return Math.min(1, Math.max(0, (t - a) / (b - a)));
}
