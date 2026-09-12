import type { PerspectiveCamera, WebGLRenderer } from 'three';

export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export type LayoutListener = (vp: Viewport) => void;

/**
 * 視口尺寸以 canvas 自己的 CSS 盒子為準（它是 position:fixed; inset:0，就是我們真正畫進去的面積）。
 * 不讀 innerWidth：iOS 旋轉後它會暫時停在舊值；visualViewport 只當 canvas 還沒排版時的備援。
 */
export function readViewport(canvas: HTMLCanvasElement, maxDpr = 2): Viewport | null {
  const vv = window.visualViewport;
  const width = Math.round(canvas.clientWidth || vv?.width || window.innerWidth || 0);
  const height = Math.round(canvas.clientHeight || vv?.height || window.innerHeight || 0);
  // 切裝置模擬、轉向的瞬間框架可能是 0×0：那不是尺寸，是「還沒排版」，回 null 讓呼叫端略過。
  if (!(width > 0 && height > 0)) return null;
  return { width, height, dpr: Math.min(window.devicePixelRatio || 1, maxDpr) };
}

/**
 * 唯一的 resize 入口。renderer 尺寸、DPR、相機、以及之後的 overlay 對位都從這裡出去，
 * 才不會有兩個地方各自量視口、各自得到不同答案。
 *
 * 正確性靠 `tick()`：渲染迴圈每幀比對 canvas 的 CSS 盒子與繪製尺寸，不一致就立刻套用——
 * 這是 three.js 手冊建議的做法，不賭事件的時機。ResizeObserver／resize／orientationchange
 * 只是讓 listener（之後的 overlay 對位）早一點被通知，經 debounce 只做最後一次。
 * 2026-09-12 實測：只靠事件時，Chrome 切裝置模擬與 iPad 轉向都可能在框架還是 0×0 或舊尺寸時觸發，
 * 之後再也沒有事件來救，canvas 就停在 1×1 或被拉長。
 */
export function createLayout(renderer: WebGLRenderer, camera: PerspectiveCamera, canvas: HTMLCanvasElement, maxDpr = 2) {
  const listeners = new Set<LayoutListener>();
  let vp: Viewport = { width: 1, height: 1, dpr: 1 };
  let timer = 0;

  function apply(): Viewport {
    const next = readViewport(canvas, maxDpr);
    if (!next) return vp;
    vp = next;
    renderer.setPixelRatio(vp.dpr);
    renderer.setSize(vp.width, vp.height, false);
    camera.aspect = vp.width / vp.height;
    camera.updateProjectionMatrix();
    for (const fn of listeners) fn(vp);
    return vp;
  }

  /** 每幀呼叫；有差才 apply，沒差時只是三個屬性讀取。 */
  function tick(): void {
    const now = readViewport(canvas, maxDpr);
    if (now && (now.width !== vp.width || now.height !== vp.height || now.dpr !== vp.dpr)) apply();
  }

  function schedule(): void {
    window.clearTimeout(timer);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        timer = window.setTimeout(apply, 120);
      });
    });
  }

  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(canvas);
  window.addEventListener('resize', schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  apply();

  return {
    get viewport(): Viewport {
      return vp;
    },
    apply,
    tick,
    onLayout(fn: LayoutListener): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
