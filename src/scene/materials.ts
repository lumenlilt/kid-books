import { CanvasTexture, MeshStandardMaterial, RepeatWrapping, type Texture } from 'three';

let grain: Texture | null = null;

/** 程序紙紋：低對比值雜訊，當凹凸圖用。一張共用，256²。 */
export function paperGrain(): Texture {
  if (grain) return grain;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context');
  const img = ctx.createImageData(size, size);
  // 兩層雜訊：細顆粒＋粗纖維
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const coarse = new Float32Array(32 * 32);
  for (let i = 0; i < coarse.length; i += 1) coarse[i] = rnd();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cx = (x / 8) % 32;
      const cy = (y / 8) % 32;
      const x0 = Math.floor(cx);
      const y0 = Math.floor(cy);
      const fx = cx - x0;
      const fy = cy - y0;
      const c = (i: number, j: number) => coarse[((j % 32) * 32 + (i % 32)) % coarse.length] ?? 0.5;
      const smooth = (c(x0, y0) * (1 - fx) + c(x0 + 1, y0) * fx) * (1 - fy) + (c(x0, y0 + 1) * (1 - fx) + c(x0 + 1, y0 + 1) * fx) * fy;
      const v = 128 + (smooth - 0.5) * 40 + (rnd() - 0.5) * 34;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v));
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  grain = new CanvasTexture(canvas);
  grain.wrapS = RepeatWrapping;
  grain.wrapT = RepeatWrapping;
  grain.repeat.set(3, 3);
  return grain;
}

/** 紙藝：無金屬、高粗糙、平面著色、帶紙紋。所有自製幾何都走這裡，換色板才換得動。 */
export function paper(color: number, opts: { roughness?: number; flat?: boolean; grain?: boolean } = {}): MeshStandardMaterial {
  const m = new MeshStandardMaterial({ color, roughness: opts.roughness ?? 0.92, metalness: 0, flatShading: opts.flat ?? true });
  if (opts.grain !== false) {
    m.bumpMap = paperGrain();
    m.bumpScale = 0.0035;
  }
  return m;
}
