import { CanvasTexture, SRGBColorSpace } from 'three';

/** 封面貼圖：底色＋大圖示＋書名。鎖住的書是灰底問號。 */
export function makeCoverTexture(opts: { color: string; icon: string; title: string; locked: boolean; ink: string; paper: string }): CanvasTexture {
  const w = 256;
  const h = 342;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context');
  ctx.fillStyle = opts.locked ? '#9a9a9a' : opts.color;
  ctx.fillRect(0, 0, w, h);
  // 書脊那一側的深色邊
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(0, 0, 18, h);
  // 內框
  ctx.strokeStyle = opts.locked ? 'rgba(255,255,255,0.35)' : opts.paper;
  ctx.lineWidth = 6;
  ctx.strokeRect(34, 22, w - 56, h - 44);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = opts.locked ? 'rgba(255,255,255,0.8)' : opts.paper;
  ctx.font = `${opts.locked ? 150 : 120}px "Huninn", "PingFang TC", system-ui, sans-serif`;
  ctx.fillText(opts.locked ? '?' : opts.icon, w / 2 + 8, h / 2 - 28);
  if (!opts.locked) {
    ctx.fillStyle = opts.ink;
    ctx.font = `bold 40px "Huninn", "PingFang TC", system-ui, sans-serif`;
    ctx.fillText(opts.title, w / 2 + 8, h - 70);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
